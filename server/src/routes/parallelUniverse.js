const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

// Get universe status for a chat
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;
    
    // Verify user is member
    const memberCheck = await db.query(
      'SELECT id FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }
    
    // Get universe info
    const universe = await db.query(
      'SELECT * FROM parallel_universes WHERE chat_id = $1',
      [chatId]
    );
    
    if (universe.rows.length === 0) {
      return res.status(404).json({ error: 'Universe not found' });
    }
    
    res.json({
      success: true,
      universe: universe.rows[0]
    });
    
  } catch (error) {
    console.error('Get universe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Switch universe (for a user)
router.post('/:chatId/switch', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { targetUniverse } = req.body; // 'real' or 'decoy'
    const userId = req.userId;
    
    // Verify user is member
    const memberCheck = await db.query(
      'SELECT id FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }
    
    // Get messages for target universe
    const messages = await db.query(`
      SELECT 
        m.*,
        u.display_name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1 AND m.universe = $2
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [chatId, targetUniverse]);
    
    res.json({
      success: true,
      currentUniverse: targetUniverse,
      messages: messages.rows.reverse()
    });
    
  } catch (error) {
    console.error('Switch universe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update auto-switch triggers
router.put('/:chatId/triggers', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { 
      autoSwitchEnabled,
      proximityTrigger,
      cameraTrigger,
      keywordTrigger,
      shakeTrigger
    } = req.body;
    const userId = req.userId;
    
    // Verify user is member
    const memberCheck = await db.query(
      'SELECT id FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }
    
    // Build triggers object
    const triggers = {};
    if (proximityTrigger !== undefined) triggers.proximity = proximityTrigger;
    if (cameraTrigger !== undefined) triggers.camera = cameraTrigger;
    if (keywordTrigger !== undefined) triggers.keyword = keywordTrigger;
    if (shakeTrigger !== undefined) triggers.shake = shakeTrigger;
    
    // Update triggers
    await db.query(`
      UPDATE parallel_universes 
      SET auto_switch_enabled = COALESCE($1, auto_switch_enabled),
          switch_triggers = switch_triggers || $2
      WHERE chat_id = $3
    `, [autoSwitchEnabled, JSON.stringify(triggers), chatId]);
    
    res.json({
      success: true,
      message: 'Triggers updated'
    });
    
  } catch (error) {
    console.error('Update triggers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
