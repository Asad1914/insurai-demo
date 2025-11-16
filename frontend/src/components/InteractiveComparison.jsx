import React, { useState, useEffect } from 'react';
import { plansAPI } from '../services/api';
import ComparisonTable from './ComparisonTable';
import './InteractiveComparison.css';

const InteractiveComparison = () => {
  const [allPlans, setAllPlans] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Comparison configuration
  const [selectionMode, setSelectionMode] = useState('top'); // 'top' or 'manual'
  const [topCount, setTopCount] = useState(3);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // User profile for AI recommendations
  const [userProfile, setUserProfile] = useState({
    age: '',
    monthly_salary: '',
    coverage_type: 'Individual',
    state: ''
  });
  const [profileSet, setProfileSet] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await plansAPI.getPlans();
      setAllPlans(data.plans);
      
      // Extract unique providers
      const uniqueProviders = [...new Set(data.plans.map(p => p.provider_name))].sort();
      setProviders(uniqueProviders);
      
      // Auto-select top 3 providers by default
      if (uniqueProviders.length >= 3) {
        setSelectedProviders(uniqueProviders.slice(0, 3));
      } else {
        setSelectedProviders(uniqueProviders);
      }
    } catch (err) {
      setError('Failed to load insurance plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionModeChange = (mode) => {
    setSelectionMode(mode);
    if (mode === 'top') {
      setSelectedProviders(providers.slice(0, topCount));
    }
  };

  const handleTopCountChange = (count) => {
    setTopCount(count);
    if (selectionMode === 'top') {
      setSelectedProviders(providers.slice(0, count));
    }
  };

  const handleProviderToggle = (provider) => {
    setSelectedProviders(prev => {
      if (prev.includes(provider)) {
        return prev.filter(p => p !== provider);
      } else {
        return [...prev, provider];
      }
    });
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (userProfile.age && userProfile.monthly_salary) {
      setProfileSet(true);
    }
  };

  const startComparison = () => {
    if (selectedProviders.length < 2) {
      alert('Please select at least 2 insurance companies to compare');
      return;
    }
    setShowComparison(true);
  };

  if (loading) {
    return (
      <div className="interactive-comparison-page">
        <div className="loading-state">Loading insurance plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interactive-comparison-page">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (showComparison) {
    return (
      <div className="interactive-comparison-page">
        <button 
          className="back-btn"
          onClick={() => setShowComparison(false)}
        >
          ← Back to Configuration
        </button>
        <ComparisonTable 
          providers={selectedProviders}
          allPlans={allPlans}
          userProfile={profileSet ? userProfile : null}
        />
      </div>
    );
  }

  return (
    <div className="interactive-comparison-page">
      <div className="comparison-config">
        <h1>🔍 Compare Insurance Plans</h1>
        <p className="subtitle">
          Get AI-powered recommendations based on your profile and compare plans side-by-side
        </p>

        {/* User Profile Section */}
        <div className="config-section">
          <h2>👤 Your Profile (Optional - for AI Recommendations)</h2>
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>Your Age</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={userProfile.age}
                  onChange={(e) => setUserProfile(prev => ({...prev, age: parseInt(e.target.value) || ''}))}
                  placeholder="e.g., 30"
                />
              </div>
              <div className="form-group">
                <label>Monthly Salary (AED)</label>
                <input
                  type="number"
                  min="0"
                  value={userProfile.monthly_salary}
                  onChange={(e) => setUserProfile(prev => ({...prev, monthly_salary: parseInt(e.target.value) || ''}))}
                  placeholder="e.g., 15000"
                />
              </div>
              <div className="form-group">
                <label>Coverage Type</label>
                <select
                  value={userProfile.coverage_type}
                  onChange={(e) => setUserProfile(prev => ({...prev, coverage_type: e.target.value}))}
                >
                  <option value="Individual">Individual</option>
                  <option value="Family">Family</option>
                  <option value="Couple">Couple</option>
                </select>
              </div>
            </div>
            {!profileSet && userProfile.age && userProfile.monthly_salary && (
              <button type="submit" className="save-profile-btn">
                ✓ Save Profile & Get AI Recommendations
              </button>
            )}
            {profileSet && (
              <div className="profile-saved">
                ✓ Profile saved! You'll see AI recommendations in the comparison.
                <button 
                  type="button" 
                  onClick={() => setProfileSet(false)}
                  className="edit-profile-btn"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Selection Mode */}
        <div className="config-section">
          <h2>🏢 Select Insurance Companies</h2>
          
          <div className="selection-mode-tabs">
            <button
              className={`mode-tab ${selectionMode === 'top' ? 'active' : ''}`}
              onClick={() => handleSelectionModeChange('top')}
            >
              Top Companies
            </button>
            <button
              className={`mode-tab ${selectionMode === 'manual' ? 'active' : ''}`}
              onClick={() => handleSelectionModeChange('manual')}
            >
              Manual Selection
            </button>
          </div>

          {selectionMode === 'top' && (
            <div className="top-selection">
              <label>
                How many top companies do you want to compare?
                <input
                  type="number"
                  min="2"
                  max={Math.min(providers.length, 5)}
                  value={topCount}
                  onChange={(e) => handleTopCountChange(parseInt(e.target.value))}
                  className="top-count-input"
                />
              </label>
              <div className="selected-providers-preview">
                <strong>Selected Companies:</strong>
                {selectedProviders.map(provider => (
                  <span key={provider} className="provider-chip">{provider}</span>
                ))}
              </div>
            </div>
          )}

          {selectionMode === 'manual' && (
            <div className="manual-selection">
              <p>Select at least 2 companies to compare:</p>
              <div className="providers-grid">
                {providers.map(provider => {
                  const providerPlans = allPlans.filter(p => p.provider_name === provider);
                  return (
                    <div
                      key={provider}
                      className={`provider-card ${selectedProviders.includes(provider) ? 'selected' : ''}`}
                      onClick={() => handleProviderToggle(provider)}
                    >
                      <div className="provider-card-header">
                        <input
                          type="checkbox"
                          checked={selectedProviders.includes(provider)}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <strong>{provider}</strong>
                      </div>
                      <div className="provider-card-info">
                        {providerPlans.length} plan{providerPlans.length !== 1 ? 's' : ''} available
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Start Comparison Button */}
        <div className="comparison-actions">
          <button
            className="start-comparison-btn"
            onClick={startComparison}
            disabled={selectedProviders.length < 2}
          >
            🔍 Compare {selectedProviders.length} Insurance Companies
          </button>
          {selectedProviders.length < 2 && (
            <p className="hint">Select at least 2 companies to start comparison</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveComparison;
