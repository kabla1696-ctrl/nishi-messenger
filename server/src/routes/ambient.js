const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');
const config = require('../config');

// Update my ambient state
router.put('/state', authenticate, async (req, res) => {
  try {
    const { activity, environment, batteryLevel, isMoving } = req.body;
    const userId = req.userId;
    
    // Validate activity
    if (activity && !config.ambient.activities.includes(activity)) {
      return res.status(400).json({ error: 'Invalid activity' });
    }
    
    // Validate environment
    if (environment && !config.ambient.environments.includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }
    
    // Upsert ambient state
    await db.query(`
      INSERT INTO ambient_states (user_id, activity, environment, battery_level, is_moving, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        activity = COALESCE($2, ambient_states.activity),
        environment = COALESCE($3, ambient_states.environment),
        battery_level = COALESCE($4, ambient_states.battery_level),
        is_moving = COALESCE($5, ambient_states.is_moving),
        updated_at = NOW()
    `, [userId, activity, environment, batteryLevel, isMoving]);
    
    res.json({
      success: true,
      message: 'Ambient state updated'
    });
    
  } catch (error) {
    console.error('Update ambient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend's ambient state
router.get('/:friendId', authenticate, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;
    
    // Check if they are friends (have a chat together)
    const friendCheck = await db.query(`
      SELECT c.id FROM chats c
      JOIN chat_members cm1 ON c.id = cm1.chat_id
      JOIN chat_members cm2 ON c.id = cm2.chat_id
      WHERE cm1.user_id = $1 AND cm2.user_id = $2
    `, [userId, friendId]);
    
    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends' });
    }
    
    // Get ambient state
    const state = await db.query(
      'SELECT * FROM ambient_states WHERE user_id = $1',
      [friendId]
    );
    
    if (state.rows.length === 0) {
      return res.json({
        success: true,
        ambient: null
      });
    }
    
    // Check if state is stale (older than 5 minutes)
    const stateAge = Date.now() - new Date(state.rows[0].updated_at).getTime();
    const isStale = stateAge > 5 * 60 * 1000;
    
    res.json({
      success: true,
      ambient: {
        ...state.rows[0],
        isStale
      }
    });
    
  } catch (error) {
    console.error('Get ambient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ambient states for multiple friends
router.post('/batch', authenticate, async (req, res) => {
  try {
    const { friendIds } = req.body;
    const userId = req.userId;
    
    // Get ambient states for all friends
    const states = await db.query(`
      SELECT 
        as2.*,
        u.display_name,
        u.avatar_url
      FROM ambient_states as2
      JOIN users u ON as2.user_id = u.id
      WHERE as2.user_id = ANY($1)
    `, [friendIds]);
    
    // Check staleness for each
    const ambientStates = states.rows.map(state => {
      const stateAge = Date.now() - new Date(state.updated_at).getTime();
      return {
        ...state,
        isStale: stateAge > 5 * 60 * 1000
      };
    });
    
    res.json({
      success: true,
      ambientStates
    });
    
  } catch (error) {
    console.error('Get batch ambient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
