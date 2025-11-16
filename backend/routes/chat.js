import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { chatWithAdvisor } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/chat
 * Chat with the insurance advisor AI
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate session ID if not provided
    const sessionId = session_id || `session_${req.user.id}_${Date.now()}`;

    // Get recent conversation history for context (last 10 messages)
    const historyResult = await query(
      `SELECT message, response FROM chat_history
       WHERE user_id = $1 AND session_id = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.id, sessionId]
    );

    // Reverse to get chronological order
    const conversationHistory = historyResult.rows.reverse();

    // Get AI response
    const aiResponse = await chatWithAdvisor(message, conversationHistory);

    // Save conversation to database
    await query(
      `INSERT INTO chat_history (user_id, session_id, message, response)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, sessionId, message, aiResponse]
    );

    res.json({
      reply: aiResponse,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to get response from AI advisor',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/history
 * Get chat history for the authenticated user
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { session_id, limit = 50 } = req.query;

    let queryText = `
      SELECT id, session_id, message, response, created_at
      FROM chat_history
      WHERE user_id = $1
    `;
    const queryParams = [req.user.id];

    if (session_id) {
      queryText += ' AND session_id = $2';
      queryParams.push(session_id);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1);
    queryParams.push(parseInt(limit));

    const result = await query(queryText, queryParams);

    res.json({
      history: result.rows.reverse(), // Return in chronological order
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

/**
 * DELETE /api/chat/history/:session_id
 * Clear chat history for a specific session
 */
router.delete('/history/:session_id', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.params;

    await query(
      'DELETE FROM chat_history WHERE user_id = $1 AND session_id = $2',
      [req.user.id, session_id]
    );

    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
