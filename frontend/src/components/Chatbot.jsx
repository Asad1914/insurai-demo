import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Chatbot.css';

const Chatbot = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate session ID
    const newSessionId = `session_${user.id}_${Date.now()}`;
    setSessionId(newSessionId);

    // Welcome message
    setMessages([
      {
        role: 'assistant',
        content: `Hello ${user.full_name}! I'm your AI Insurance Advisor. I can help you understand insurance concepts, explain plan details, and answer any questions you have about insurance in ${user.state.state_name}. How can I assist you today?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      // Call the API
      const response = await chatAPI.sendMessage(userMessage, sessionId);

      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'What is a deductible?',
    'What\'s the difference between comprehensive and third-party insurance?',
    'How does health insurance work in the UAE?',
    'What factors affect my insurance premium?',
  ];

  const handleSuggestion = (question) => {
    setInputMessage(question);
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-sidebar">
        <div className="sidebar-header">
          <h2>InsurAI Advisor</h2>
          <p>Your 24/7 Insurance Expert</p>
        </div>

        <div className="user-profile">
          <div className="profile-avatar">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user.full_name}</div>
            <div className="profile-state">{user.state.state_name}</div>
          </div>
        </div>

        <div className="suggestions">
          <h3>Suggested Questions:</h3>
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              className="suggestion-btn"
              onClick={() => handleSuggestion(question)}
            >
              {question}
            </button>
          ))}
        </div>

        <button className="btn-home-nav" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>

      <div className="chatbot-main">
        <div className="chat-header">
          <h1>AI Insurance Advisor</h1>
          <p>Ask me anything about insurance!</p>
        </div>

        <div className="messages-container">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role} ${message.isError ? 'error' : ''}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? (
                  user.full_name.charAt(0).toUpperCase()
                ) : (
                  '🤖'
                )}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <textarea
            className="chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question here..."
            rows="3"
            disabled={loading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={loading || !inputMessage.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
