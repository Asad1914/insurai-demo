import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { plansAPI } from '../services/api';
import './ComparisonPage.css';

const ComparisonPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const filters = location.state?.filters || {};

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [showingAlternatives, setShowingAlternatives] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    setShowingAlternatives(false);
    
    try {
      const data = await plansAPI.getPlans(filters);
      
      if (data.plans.length === 0) {
        // No exact matches - fetch alternative plans with relaxed filters
        console.log('No exact matches found, fetching alternatives...');
        const alternativeFilters = {
          type: filters.type,
          state_id: filters.state_id,
        };
        
        const altData = await plansAPI.getPlans(alternativeFilters);
        
        if (altData.plans.length > 0) {
          // Sort by closest to budget
          const budget = parseFloat(filters.max_cost) || 0;
          const sortedPlans = altData.plans
            .map(plan => ({
              ...plan,
              priceDiff: Math.abs((plan.monthly_cost || 0) - budget)
            }))
            .sort((a, b) => a.priceDiff - b.priceDiff)
            .slice(0, 10); // Show top 10 closest matches
          
          setPlans(sortedPlans);
          setShowingAlternatives(true);
        } else {
          setError('No insurance plans available for your state. Please contact support.');
        }
      } else {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('Failed to load insurance plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return amount ? `AED ${parseFloat(amount).toLocaleString()}` : 'N/A';
  };

  const getPriceDifference = (planCost) => {
    if (!showingAlternatives || !filters.max_cost) return null;
    const budget = parseFloat(filters.max_cost);
    const cost = parseFloat(planCost) || 0;
    const diff = cost - budget;
    
    if (diff === 0) return { text: 'Within budget', color: '#10b981' };
    if (diff < 0) return { text: `${formatCurrency(Math.abs(diff))} under budget`, color: '#10b981' };
    return { text: `${formatCurrency(diff)} over budget`, color: '#ef4444' };
  };

  const formatBoolean = (value) => {
    if (value === null || value === undefined) return '—';
    return value ? '✓' : '✗';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '—';
    return value;
  };

  // Extract all unique features from all plans
  const getAllFeatures = () => {
    const featureSet = new Set();
    
    plans.forEach(plan => {
      if (plan.structured_features) {
        Object.keys(plan.structured_features).forEach(key => {
          featureSet.add(key);
        });
      }
    });
    
    return Array.from(featureSet);
  };

  const getFeatureLabel = (key) => {
    const labels = {
      network_hospitals_count: 'Network Hospitals',
      network_type: 'Network Type',
      uae_coverage: 'UAE Coverage',
      gcc_coverage: 'GCC Coverage',
      international_coverage: 'International Coverage',
      outpatient_coverage: 'Outpatient',
      inpatient_coverage: 'Inpatient',
      dental_coverage: 'Dental',
      optical_coverage: 'Optical',
      maternity_coverage: 'Maternity',
      pre_existing_conditions: 'Pre-existing Conditions',
      pharmacy_coverage: 'Pharmacy',
      emergency_coverage: 'Emergency',
      ambulance_service: 'Ambulance',
      preventive_care: 'Preventive Care',
      chronic_conditions_covered: 'Chronic Conditions',
      mental_health_coverage: 'Mental Health',
      physiotherapy_coverage: 'Physiotherapy',
      alternative_medicine: 'Alternative Medicine',
      waiting_period_days: 'Waiting Period (days)',
      copay_percentage: 'Co-pay %',
      room_type: 'Room Type',
      cashless_claims: 'Cashless Claims'
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderFeatureValue = (plan, featureKey) => {
    const value = plan.structured_features?.[featureKey];
    
    if (typeof value === 'boolean') {
      return <span className={`feature-value ${value ? 'yes' : 'no'}`}>{formatBoolean(value)}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="feature-value number">{value}</span>;
    }
    
    return <span className="feature-value">{formatValue(value)}</span>;
  };

  if (loading) {
    return (
      <div className="comparison-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Finding the best plans for you...</p>
        </div>
      </div>
    );
  }

  const allFeatures = getAllFeatures();

  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <h1>Insurance Plans Comparison</h1>
        <p>Found {plans.length} plan{plans.length !== 1 ? 's' : ''} matching your criteria</p>
        <div className="header-actions">
          <button 
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')} 
            className="btn-secondary"
          >
            {viewMode === 'table' ? '📋 Card View' : '📊 Table View'}
          </button>
          <button onClick={() => navigate('/questionnaire')} className="btn-secondary">
            Refine Search
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>

      {showingAlternatives && plans.length > 0 && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem',
          margin: '1rem 0',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#92400e', fontSize: '1rem' }}>
            ℹ️ No exact matches found for your budget. Showing closest alternative plans sorted by price similarity.
          </p>
          <p style={{ margin: '0.5rem 0 0 0', color: '#92400e', fontSize: '0.9rem' }}>
            You can adjust your budget criteria or explore these similar options.
          </p>
        </div>
      )}

      {error && (
        <div className="error-box">
          <p>{error}</p>
          <button onClick={() => navigate('/questionnaire')}>Try Different Criteria</button>
        </div>
      )}

      {!error && plans.length > 0 && viewMode === 'table' && (
        <div className="comparison-table-container">
          <div className="table-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="provider-col sticky-col">Provider</th>
                  <th>Plan Name</th>
                  <th>Monthly Cost</th>
                  <th>Annual Cost</th>
                  <th>Max Coverage</th>
                  {allFeatures.map(feature => (
                    <th key={feature}>{getFeatureLabel(feature)}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="provider-col sticky-col">
                      <div className="provider-cell">
                        <strong>{plan.provider_name}</strong>
                        <span className="plan-type-badge">{plan.plan_type}</span>
                      </div>
                    </td>
                    <td><strong>{plan.plan_name}</strong></td>
                    <td>
                      <div>{formatCurrency(plan.monthly_cost)}</div>
                      {showingAlternatives && plan.monthly_cost && getPriceDifference(plan.monthly_cost) && (
                        <small style={{ 
                          color: getPriceDifference(plan.monthly_cost).color,
                          fontSize: '0.8rem',
                          display: 'block',
                          marginTop: '0.25rem'
                        }}>
                          {getPriceDifference(plan.monthly_cost).text}
                        </small>
                      )}
                    </td>
                    <td>{formatCurrency(plan.annual_cost)}</td>
                    <td>{formatCurrency(plan.max_coverage)}</td>
                    {allFeatures.map(feature => (
                      <td key={feature} className="feature-cell">
                        {renderFeatureValue(plan, feature)}
                      </td>
                    ))}
                    <td>
                      <button 
                        className="btn-ask-ai" 
                        onClick={() => navigate('/chat', { state: { plan } })}
                      >
                        Ask AI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!error && plans.length > 0 && viewMode === 'cards' && (
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="plan-header">
                <div className="provider-info">
                  {plan.logo_url && (
                    <img src={plan.logo_url} alt={plan.provider_name} className="provider-logo" />
                  )}
                  <div>
                    <h3 className="plan-name">{plan.plan_name}</h3>
                    <p className="provider-name">{plan.provider_name}</p>
                  </div>
                </div>
                <div className="plan-type-badge">{plan.plan_type}</div>
              </div>

              <div className="plan-pricing">
                <div className="price-main">
                  <span className="price-amount">{formatCurrency(plan.monthly_cost)}</span>
                  <span className="price-period">/month</span>
                </div>
                {showingAlternatives && plan.monthly_cost && getPriceDifference(plan.monthly_cost) && (
                  <div style={{ 
                    color: getPriceDifference(plan.monthly_cost).color,
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginTop: '0.5rem'
                  }}>
                    {getPriceDifference(plan.monthly_cost).text}
                  </div>
                )}
                {plan.annual_cost && (
                  <div className="price-annual">
                    or {formatCurrency(plan.annual_cost)}/year
                  </div>
                )}
              </div>

              <div className="plan-details">
                <div className="detail-row">
                  <span className="detail-label">Deductible:</span>
                  <span className="detail-value">{formatCurrency(plan.deductible)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Max Coverage:</span>
                  <span className="detail-value">{formatCurrency(plan.max_coverage)}</span>
                </div>
                {plan.coverage_type && (
                  <div className="detail-row">
                    <span className="detail-label">Coverage Type:</span>
                    <span className="detail-value">{plan.coverage_type}</span>
                  </div>
                )}
                {plan.state_name && (
                  <div className="detail-row">
                    <span className="detail-label">Available in:</span>
                    <span className="detail-value">{plan.state_name}</span>
                  </div>
                )}
              </div>

              {plan.features && plan.features.length > 0 && (
                <div className="plan-features">
                  <h4>Key Features:</h4>
                  <ul>
                    {plan.features.slice(0, 5).map((feature, index) => (
                      <li key={index}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="btn-select-plan" onClick={() => navigate('/chat')}>
                Ask AI About This Plan
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="comparison-footer">
        <div className="help-section">
          <h3>Need Help Choosing?</h3>
          <p>Our AI advisor can help you understand the differences and make the right choice.</p>
          <button onClick={() => navigate('/chat')} className="btn-chat">
            Chat with AI Advisor
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
