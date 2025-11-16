import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-brand">InsurAI</div>
        <div className="nav-links">
          <span className="user-info">Welcome, {user?.full_name}</span>
          <span className="user-state">{user?.state?.state_name}</span>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="nav-button admin-button">
              Admin Dashboard
            </button>
          )}
          <button onClick={handleLogout} className="nav-button">
            Logout
          </button>
        </div>
      </nav>

      <main className="home-main">
        <section className="hero-section">
          <h1 className="hero-title">Find Your Perfect Insurance Plan</h1>
          <p className="hero-subtitle">
            AI-powered insurance comparison for UAE residents
          </p>
          <p className="hero-description">
            Answer a few questions and let our AI help you find the best insurance plans
            tailored to your needs in {user?.state?.state_name}.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="cta-button"
              onClick={() => navigate('/questionnaire')}
            >
              Start Questionnaire
            </button>
            <button
              className="cta-button"
              style={{ background: '#2563eb' }}
              onClick={() => navigate('/interactive-compare')}
            >
              Compare Plans Interactively
            </button>
          </div>
        </section>

        <section className="features-section">
          <h2>Why Choose InsurAI?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered</h3>
              <p>Smart recommendations based on your specific needs and preferences</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Best Prices</h3>
              <p>Compare plans from multiple providers to find the best value</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Interactive Comparison</h3>
              <p>Compare multiple plans side-by-side with AI recommendations</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>24/7 AI Advisor</h3>
              <p>Get instant answers to your insurance questions anytime</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <h2>Need Help Understanding Insurance?</h2>
          <p>Chat with our AI insurance advisor to get instant answers to your questions</p>
          <button
            className="secondary-button"
            onClick={() => navigate('/chat')}
          >
            Chat with AI Advisor
          </button>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2024 InsurAI. AI-powered insurance platform for UAE.</p>
      </footer>
    </div>
  );
};

export default Home;
