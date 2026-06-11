const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

// Get user's chats
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await db.query(`
      SELECT 
        c.*,
        cm.user_id as member_id,
        u.display_name,
        u.avatar_url,
        u.is_online,
        u.last_seen,
        m.content as last_message,
        m.created_at as last_message_at
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      JOIN users u ON cm.user_id = u.id
      LEFT JOIN messages m ON c.id = m.chat_id AND m.created_at = (
        SELECT MAX(created_at) FROM messages WHERE chat_id = c.id
      )
      WHERE cm.user_id = $1
      ORDER BY m.created_at DESC
    `, [userId]);
    
    res.json({
      success: true,
      chats: result.rows
    });
    
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new chat
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.userId;
    
    // Check if chat already exists
    const existingChat = await db.query(`
      SELECT c.id FROM chats c
      JOIN chat_members cm1 ON c.id = cm1.chat_id
      JOIN chat_members cm2 ON c.id = cm2.chat_id
      WHERE cm1.user_id = $1 AND cm2.user_id = $2 AND c.type = 'direct'
    `, [userId, recipientId]);
    
    if (existingChat.rows.length > 0) {
      return res.json({
        success: true,
        chatId: existingChat.rows[0].id,
        message: 'Chat already exists'
      });
    }
    
    // Create new chat
    const chatId = uuidv4();
    
    await db.query(
      'INSERT INTO chats (id, type) VALUES ($1, $2)',
      [chatId, 'direct']
    );
    
    // Add members
    await db.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)',
      [chatId, userId]
    );
    
    await db.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)',
      [chatId, recipientId]
    );
    
    // Create parallel universe for this chat
    await db.query(
      'INSERT INTO parallel_universes (chat_id) VALUES ($1)',
      [chatId]
    );
    
    res.status(201).json({
      success: true,
      chatId,
      message: 'Chat created'
    });
    
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat messages
router.get('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { universe = 'real', limit = 50, offset = 0 } = req.query;
    const userId = req.userId;
    
    // Verify user is member of chat
    const memberCheck = await db.query(
      'SELECT id FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }
    
    // Get messages
    const result = await db.query(`
      SELECT 
        m.*,
        u.display_name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1 AND m.universe = $2
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `, [chatId, universe, limit, offset]);
    
    res.json({
      success: true,
      messages: result.rows.reverse()
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text', universe = 'real', isScreenshotTrapped = false } = req.body;
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
      INSERT INTO messages (id, chat_id, sender_id, content, type, universe, is_screenshot_trapped)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [messageId, chatId, userId, content, type, universe, isScreenshotTrapped]);
    
    // Update parallel universe count
    if (universe === 'real') {
      await db.query(`
        UPDATE parallel_universes 
        SET real_messages_count = real_messages_count + 1 
        WHERE chat_id = $1
      `, [chatId]);
    } else {
      await db.query(`
        UPDATE parallel_universes 
        SET decoy_messages_count = decoy_messages_count + 1 
        WHERE chat_id = $1
      `, [chatId]);
    }
    
    // Get sender info
    const sender = await db.query(
      'SELECT display_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    
    const message = {
      id: messageId,
      chatId,
      senderId: userId,
      senderName: sender.rows[0].display_name,
      senderAvatar: sender.rows[0].avatar_url,
      content,
      type,
      universe,
      isScreenshotTrapped,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      message
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message
router.delete('/:chatId/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.userId;
    
    // Verify user is sender or member
    const messageCheck = await db.query(
      'SELECT sender_id FROM messages WHERE id = $1 AND chat_id = $2',
      [messageId, chatId]
    );
    
    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Delete message
    await db.query('DELETE FROM messages WHERE id = $1', [messageId]);
    
    res.json({
      success: true,
      message: 'Message deleted'
    });
    
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
