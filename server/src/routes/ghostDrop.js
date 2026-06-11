const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');
const config = require('../config');

// Create ghost drop
router.post('/', authenticate, async (req, res) => {
  try {
    const { chatId, content, latitude, longitude, radiusMeters } = req.body;
    const userId = req.userId;
    
    // Verify user is member of chat
    const memberCheck = await db.query(
      'SELECT id FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }
    
    // Create message
    const messageId = uuidv4();
    await db.query(`
      INSERT INTO messages (id, chat_id, sender_id, content, type, universe, is_ghost_drop)
      VALUES ($1, $2, $3, $4, 'text', 'real', true)
    `, [messageId, chatId, userId, content]);
    
    // Create ghost drop
    const dropId = uuidv4();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + config.ghostDrop.expiryDays);
    
    await db.query(`
      INSERT INTO ghost_drops (id, creator_id, chat_id, message_id, latitude, longitude, radius_meters, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      dropId,
      userId,
      chatId,
      messageId,
      latitude,
      longitude,
      radiusMeters || config.ghostDrop.defaultRadius,
      expiryDate
    ]);
    
    res.status(201).json({
      success: true,
      ghostDrop: {
        id: dropId,
        messageId,
        latitude,
        longitude,
        radiusMeters: radiusMeters || config.ghostDrop.defaultRadius,
        expiresAt: expiryDate
      },
      message: 'Ghost drop created! 🗺️'
    });
    
  } catch (error) {
    console.error('Create ghost drop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my ghost drops
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await db.query(`
      SELECT 
        gd.*,
        m.content,
        u.display_name as creator_name
      FROM ghost_drops gd
      JOIN messages m ON gd.message_id = m.id
      JOIN users u ON gd.creator_id = u.id
      WHERE gd.creator_id = $1
      ORDER BY gd.created_at DESC
    `, [userId]);
    
    res.json({
      success: true,
      ghostDrops: result.rows
    });
    
  } catch (error) {
    console.error('Get ghost drops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby ghost drops
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 5 } = req.query;
    const userId = req.userId;
    
    // Find ghost drops within radius using Haversine formula
    const result = await db.query(`
      SELECT 
        gd.*,
        m.content,
        u.display_name as creator_name,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(gd.latitude)) *
            cos(radians(gd.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(gd.latitude))
          )
        ) AS distance_km
      FROM ghost_drops gd
      JOIN messages m ON gd.message_id = m.id
      JOIN users u ON gd.creator_id = u.id
      WHERE gd.is_claimed = false 
        AND gd.expires_at > NOW()
        AND gd.creator_id != $3
      HAVING (
        6371 * acos(
          cos(radians($1)) * cos(radians(gd.latitude)) *
          cos(radians(gd.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(gd.latitude))
        )
      ) < $4
      ORDER BY distance_km ASC
    `, [latitude, longitude, userId, radiusKm]);
    
    res.json({
      success: true,
      ghostDrops: result.rows
    });
    
  } catch (error) {
    console.error('Get nearby drops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Claim a ghost drop
router.post('/:dropId/claim', authenticate, async (req, res) => {
  try {
    const { dropId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.userId;
    
    // Get ghost drop
    const drop = await db.query(
      'SELECT * FROM ghost_drops WHERE id = $1',
      [dropId]
    );
    
    if (drop.rows.length === 0) {
      return res.status(404).json({ error: 'Ghost drop not found' });
    }
    
    const ghostDrop = drop.rows[0];
    
    // Check if expired
    if (new Date(ghostDrop.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Ghost drop has expired' });
    }
    
    // Check if already claimed
    if (ghostDrop.is_claimed) {
      return res.status(409).json({ error: 'Ghost drop already claimed' });
    }
    
    // Check proximity (Haversine distance)
    const distance = calculateDistance(
      latitude, longitude,
      ghostDrop.latitude, ghostDrop.longitude
    );
    
    if (distance > ghostDrop.radius_meters / 1000) {
      return res.status(403).json({ 
        error: 'Too far away',
        distanceKm: distance,
        requiredKm: ghostDrop.radius_meters / 1000
      });
    }
    
    // Claim the drop
    await db.query(`
      UPDATE ghost_drops 
      SET is_claimed = true, claimed_by = $1, claimed_at = NOW()
      WHERE id = $2
    `, [userId, dropId]);
    
    // Get the message content
    const message = await db.query(
      'SELECT content FROM messages WHERE id = $1',
      [ghostDrop.message_id]
    );
    
    res.json({
      success: true,
      message: message.rows[0].content,
      claimedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Claim ghost drop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ghost drop
router.delete('/:dropId', authenticate, async (req, res) => {
  try {
    const { dropId } = req.params;
    const userId = req.userId;
    
    // Verify ownership
    const drop = await db.query(
      'SELECT creator_id FROM ghost_drops WHERE id = $1',
      [dropId]
    );
    
    if (drop.rows.length === 0) {
      return res.status(404).json({ error: 'Ghost drop not found' });
    }
    
    if (drop.rows[0].creator_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await db.query('DELETE FROM ghost_drops WHERE id = $1', [dropId]);
    
    res.json({
      success: true,
      message: 'Ghost drop deleted'
    });
    
  } catch (error) {
    console.error('Delete ghost drop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = router;
