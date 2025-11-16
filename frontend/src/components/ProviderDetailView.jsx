import React from 'react';
import './ProviderDetailView.css';

const ProviderDetailView = ({ plans, providerName }) => {
  if (!plans || plans.length === 0) {
    return (
      <div className="provider-detail-empty">
        <p>No plans available for {providerName}</p>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return amount ? `AED ${parseFloat(amount).toLocaleString()}` : 'N/A';
  };

  const renderCostTable = (plan) => {
    // Parse age_based_pricing if it's a string
    let agePricing = plan.age_based_pricing;
    if (typeof agePricing === 'string') {
      try {
        agePricing = JSON.parse(agePricing);
      } catch (e) {
        console.error('Failed to parse age_based_pricing:', e);
        agePricing = [];
      }
    }

    // Check if we have age-based pricing data
    const hasAgePricing = agePricing && Array.isArray(agePricing) && agePricing.length > 0;

    return (
      <div className="table-section cost-table-section">
        <div className="table-header">
          <h4>💰 Cost Table (Age-Based Pricing)</h4>
        </div>
        
        {hasAgePricing ? (
          <div className="table-container">
            <table className="data-table cost-table">
              <thead>
                <tr>
                  <th>Age Range</th>
                  <th>Annual Premium (AED)</th>
                </tr>
              </thead>
              <tbody>
                {agePricing.map((item, index) => (
                  <tr key={index}>
                    <td className="age-range-cell">{item.age_range}</td>
                    <td className="premium-cell">{item.premium.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(plan.deductible || plan.max_coverage) && (
              <div className="table-footer-info">
                {plan.deductible && (
                  <div className="info-item">
                    <strong>Deductible:</strong> {formatCurrency(plan.deductible)}
                  </div>
                )}
                {plan.max_coverage && (
                  <div className="info-item">
                    <strong>Max Coverage:</strong> {formatCurrency(plan.max_coverage)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="table-empty">
            <p>No age-based pricing data available</p>
            {(plan.monthly_cost || plan.annual_cost) && (
              <div className="fallback-pricing">
                {plan.monthly_cost && <p><strong>Monthly:</strong> {formatCurrency(plan.monthly_cost)}</p>}
                {plan.annual_cost && <p><strong>Annual:</strong> {formatCurrency(plan.annual_cost)}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderBenefitsTable = (plan) => {
    // Parse benefits_table if it's a string
    let benefitsTable = plan.benefits_table;
    
    // Check if we have structured features
    let structuredFeatures = plan.structured_features;
    if (typeof structuredFeatures === 'string') {
      try {
        structuredFeatures = JSON.parse(structuredFeatures);
      } catch (e) {
        structuredFeatures = null;
      }
    }

    return (
      <div className="table-section benefits-table-section">
        <div className="table-header">
          <h4>📋 Table of Benefits</h4>
        </div>
        
        <div className="table-container">
          {/* Removed raw benefits table to avoid duplication */}

          {/* Show structured coverage features */}
          {structuredFeatures && (
            <>
              <div className="benefits-coverage-section">
                <h5>📋 Coverage Benefits Summary</h5>
                <table className="data-table benefits-table">
                  <thead>
                    <tr>
                      <th style={{width: '40%'}}>Benefit Category</th>
                      <th style={{width: '25%'}}>Coverage Status</th>
                      <th style={{width: '35%'}}>Additional Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Core Medical Coverage */}
                    {(structuredFeatures.outpatient_coverage !== null || structuredFeatures.inpatient_coverage !== null) && (
                      <tr className="category-row">
                        <td colSpan="3" style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', padding: '8px'}}>
                          🏥 Core Medical Coverage
                        </td>
                      </tr>
                    )}
                    {structuredFeatures.outpatient_coverage !== null && (
                      <tr>
                        <td>Outpatient Coverage</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.outpatient_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.outpatient_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>-</td>
                      </tr>
                    )}
                    {structuredFeatures.inpatient_coverage !== null && (
                      <tr>
                        <td>Inpatient Coverage</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.inpatient_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.inpatient_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>{structuredFeatures.room_type || '-'}</td>
                      </tr>
                    )}

                    {/* Additional Health Benefits */}
                    {(structuredFeatures.dental_coverage !== null || structuredFeatures.optical_coverage !== null) && (
                      <tr className="category-row">
                        <td colSpan="3" style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', padding: '8px'}}>
                          🦷 Additional Health Benefits
                        </td>
                      </tr>
                    )}
                    {structuredFeatures.dental_coverage !== null && (
                      <tr>
                        <td>Dental Coverage</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.dental_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.dental_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>-</td>
                      </tr>
                    )}
                    {structuredFeatures.optical_coverage !== null && (
                      <tr>
                        <td>Optical/Vision Coverage</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.optical_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.optical_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>-</td>
                      </tr>
                    )}

                    {/* Maternity & Family Coverage */}
                    {structuredFeatures.maternity_coverage !== null && (
                      <>
                        <tr className="category-row">
                          <td colSpan="3" style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', padding: '8px'}}>
                            👶 Maternity & Family Coverage
                          </td>
                        </tr>
                        <tr>
                          <td>Maternity Coverage</td>
                          <td className="status-cell">
                            <span className={`status-badge ${structuredFeatures.maternity_coverage ? 'covered' : 'not-covered'}`}>
                              {structuredFeatures.maternity_coverage ? '✓ Covered' : '✗ Not Covered'}
                            </span>
                          </td>
                          <td>-</td>
                        </tr>
                      </>
                    )}

                    {/* Pharmacy & Emergency Services */}
                    {(structuredFeatures.pharmacy_coverage !== null || structuredFeatures.emergency_coverage !== null) && (
                      <tr className="category-row">
                        <td colSpan="3" style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', padding: '8px'}}>
                          💊 Pharmacy & Emergency Services
                        </td>
                      </tr>
                    )}
                    {structuredFeatures.pharmacy_coverage !== null && (
                      <tr>
                        <td>Pharmacy Coverage</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.pharmacy_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.pharmacy_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>{structuredFeatures.copay_percentage ? `${structuredFeatures.copay_percentage}% copay` : '-'}</td>
                      </tr>
                    )}
                    {structuredFeatures.emergency_coverage !== null && (
                      <tr>
                        <td>Emergency Services</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.emergency_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.emergency_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>{structuredFeatures.ambulance_service ? 'Includes Ambulance' : '-'}</td>
                      </tr>
                    )}

                    {/* Specialized Medical Services */}
                    {(structuredFeatures.pre_existing_conditions !== null || structuredFeatures.mental_health_coverage !== null || structuredFeatures.physiotherapy_coverage !== null) && (
                      <tr className="category-row">
                        <td colSpan="3" style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', padding: '8px'}}>
                          🩺 Specialized Medical Services
                        </td>
                      </tr>
                    )}
                    {structuredFeatures.pre_existing_conditions !== null && (
                      <tr>
                        <td>Pre-existing Conditions</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.pre_existing_conditions ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.pre_existing_conditions ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>{structuredFeatures.waiting_period_days ? `${structuredFeatures.waiting_period_days} days waiting` : '-'}</td>
                      </tr>
                    )}
                    {structuredFeatures.mental_health_coverage !== null && (
                      <tr>
                        <td>Mental Health</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.mental_health_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.mental_health_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>-</td>
                      </tr>
                    )}
                    {structuredFeatures.physiotherapy_coverage !== null && (
                      <tr>
                        <td>Physiotherapy</td>
                        <td className="status-cell">
                          <span className={`status-badge ${structuredFeatures.physiotherapy_coverage ? 'covered' : 'not-covered'}`}>
                            {structuredFeatures.physiotherapy_coverage ? '✓ Covered' : '✗ Not Covered'}
                          </span>
                        </td>
                        <td>-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="benefits-network-section">
                <h5>Network & Coverage Area</h5>
                <div className="network-info-grid">
                  {structuredFeatures.network_hospitals_count && (
                    <div className="network-info-item">
                      <span className="info-icon">🏥</span>
                      <span className="info-text"><strong>{structuredFeatures.network_hospitals_count}</strong> Network Hospitals</span>
                    </div>
                  )}
                  {structuredFeatures.network_type && (
                    <div className="network-info-item">
                      <span className="info-icon">🔗</span>
                      <span className="info-text"><strong>{structuredFeatures.network_type}</strong> Network</span>
                    </div>
                  )}
                  {structuredFeatures.uae_coverage !== null && (
                    <div className="network-info-item">
                      <span className="info-icon">🇦🇪</span>
                      <span className="info-text">UAE: <strong>{structuredFeatures.uae_coverage ? 'Covered' : 'Not Covered'}</strong></span>
                    </div>
                  )}
                  {structuredFeatures.gcc_coverage !== null && (
                    <div className="network-info-item">
                      <span className="info-icon">🌍</span>
                      <span className="info-text">GCC: <strong>{structuredFeatures.gcc_coverage ? 'Covered' : 'Not Covered'}</strong></span>
                    </div>
                  )}
                  {structuredFeatures.international_coverage !== null && (
                    <div className="network-info-item">
                      <span className="info-icon">✈️</span>
                      <span className="info-text">International: <strong>{structuredFeatures.international_coverage ? 'Covered' : 'Not Covered'}</strong></span>
                    </div>
                  )}
                  {structuredFeatures.cashless_claims !== null && (
                    <div className="network-info-item">
                      <span className="info-icon">💳</span>
                      <span className="info-text">Cashless Claims: <strong>{structuredFeatures.cashless_claims ? 'Available' : 'Not Available'}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Fallback to features array if no structured data */}
          {!benefitsTable && !structuredFeatures && plan.features && plan.features.length > 0 && (
            <div className="benefits-features-list">
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {/* If no data at all */}
          {!benefitsTable && !structuredFeatures && (!plan.features || plan.features.length === 0) && (
            <div className="table-empty">
              <p>No benefits information available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="provider-detail-view">
      <div className="provider-detail-header">
        <h3>{providerName}</h3>
        <p className="plans-count">{plans.length} Plan{plans.length !== 1 ? 's' : ''} Available</p>
      </div>

      {plans.map((plan, index) => (
        <div key={plan.id || index} className="plan-detail-section">
          <div className="plan-detail-header">
            <div>
              <h4 className="plan-detail-name">{plan.plan_name}</h4>
              <div className="plan-detail-meta">
                <span className="plan-type-tag">{plan.plan_type}</span>
                {plan.coverage_type && (
                  <span className="coverage-type-tag">{plan.coverage_type}</span>
                )}
                {plan.state_name && (
                  <span className="state-tag">📍 {plan.state_name}</span>
                )}
              </div>
            </div>
            <div className="plan-status">
              <span className={`status-indicator ${plan.is_active ? 'active' : 'inactive'}`}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

        <div className="plan-tables-container">
          {/* Table 1: Cost Table (Age-Based Pricing) */}
          {renderCostTable(plan)}

          {/* Table 2: Benefits Table */}
          {renderBenefitsTable(plan)}
        </div>

        {/* Additional Details */}
        {(plan.eligibility_criteria || plan.exclusions) && (
          <div className="plan-additional-details">
            {plan.eligibility_criteria && (
              <div className="detail-section">
                <h5>✅ Eligibility Criteria</h5>
                <p>{plan.eligibility_criteria}</p>
              </div>
            )}
            {plan.exclusions && (
              <div className="detail-section">
                <h5>❌ Exclusions</h5>
                <p>{plan.exclusions}</p>
              </div>
            )}
          </div>
        )}

        {plan.document_source && (
          <div className="document-source">
            <small>📄 Source: {plan.document_source}</small>
          </div>
        )}
      </div>
      ))}
    </div>
  );
};

export default ProviderDetailView;
