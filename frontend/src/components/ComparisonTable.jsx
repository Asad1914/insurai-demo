import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import './ComparisonTable.css';

const ComparisonTable = ({ providers, allPlans, userProfile }) => {
  // State to track selected plan for each provider
  const [selectedPlans, setSelectedPlans] = useState(() => {
    const initial = {};
    providers.forEach(provider => {
      const providerPlans = allPlans.filter(p => p.provider_name === provider);
      if (providerPlans.length > 0) {
        initial[provider] = providerPlans[0].id;
      }
    });
    return initial;
  });

  const tableRef = useRef(null);

  const handlePlanChange = (provider, planId) => {
    setSelectedPlans(prev => ({
      ...prev,
      [provider]: parseInt(planId)
    }));
  };

  const getSelectedPlan = (provider) => {
    const planId = selectedPlans[provider];
    return allPlans.find(p => p.id === planId);
  };

  const getProviderPlans = (provider) => {
    return allPlans.filter(p => p.provider_name === provider);
  };

  const parseStructuredFeatures = (plan) => {
    if (!plan.structured_features) return {};
    if (typeof plan.structured_features === 'string') {
      try {
        return JSON.parse(plan.structured_features);
      } catch (e) {
        return {};
      }
    }
    return plan.structured_features;
  };

  const parseAgePricing = (plan) => {
    if (!plan.age_based_pricing) return [];
    if (typeof plan.age_based_pricing === 'string') {
      try {
        return JSON.parse(plan.age_based_pricing);
      } catch (e) {
        return [];
      }
    }
    return plan.age_based_pricing;
  };

  const getAIRecommendation = (plan) => {
    if (!userProfile || !userProfile.monthly_salary) return null;
    
    const salary = userProfile.monthly_salary;
    const features = parseStructuredFeatures(plan);
    const agePricing = parseAgePricing(plan);
    
    // Find premium for user's age
    let premium = plan.monthly_cost;
    if (agePricing.length > 0 && userProfile.age) {
      const ageMatch = agePricing.find(ap => {
        const [min, max] = ap.age_range.split('-').map(x => parseInt(x));
        return userProfile.age >= min && userProfile.age <= max;
      });
      if (ageMatch) {
        premium = ageMatch.premium / 12; // Convert annual to monthly
      }
    }

    if (!premium) return null;

    const affordabilityRatio = (premium / salary) * 100;
    
    let score = 0;
    let reasons = [];

    // Affordability (40% weight)
    if (affordabilityRatio < 5) {
      score += 40;
      reasons.push('Highly affordable');
    } else if (affordabilityRatio < 10) {
      score += 30;
      reasons.push('Affordable');
    } else if (affordabilityRatio < 15) {
      score += 20;
      reasons.push('Moderately priced');
    } else {
      score += 10;
      reasons.push('Premium pricing');
    }

    // Coverage breadth (30% weight)
    const coverageCount = [
      features.outpatient_coverage,
      features.inpatient_coverage,
      features.dental_coverage,
      features.optical_coverage,
      features.maternity_coverage,
      features.pharmacy_coverage,
      features.emergency_coverage
    ].filter(Boolean).length;
    
    score += (coverageCount / 7) * 30;
    if (coverageCount >= 6) reasons.push('Comprehensive coverage');
    else if (coverageCount >= 4) reasons.push('Good coverage');

    // Special features (30% weight)
    if (features.pre_existing_conditions) {
      score += 10;
      reasons.push('Covers pre-existing conditions');
    }
    if (features.cashless_claims) {
      score += 10;
      reasons.push('Cashless claims');
    }
    if (features.international_coverage) {
      score += 5;
      reasons.push('International coverage');
    }
    if (features.network_hospitals_count && features.network_hospitals_count > 50) {
      score += 5;
      reasons.push('Wide hospital network');
    }

    return {
      score: Math.round(score),
      affordabilityRatio: affordabilityRatio.toFixed(1),
      reasons: reasons,
      recommended: score >= 70
    };
  };

  const exportToPDF = () => {
    const element = tableRef.current;
    const opt = {
      margin: 10,
      filename: `insurance-comparison-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const benefitCategories = [
    { key: 'outpatient_coverage', label: 'Outpatient Coverage', icon: '🏥' },
    { key: 'inpatient_coverage', label: 'Inpatient Coverage', icon: '🏨' },
    { key: 'dental_coverage', label: 'Dental Coverage', icon: '🦷' },
    { key: 'optical_coverage', label: 'Optical/Vision', icon: '👓' },
    { key: 'maternity_coverage', label: 'Maternity Coverage', icon: '👶' },
    { key: 'pharmacy_coverage', label: 'Pharmacy Coverage', icon: '💊' },
    { key: 'emergency_coverage', label: 'Emergency Services', icon: '🚑' },
    { key: 'pre_existing_conditions', label: 'Pre-existing Conditions', icon: '📋' },
    { key: 'mental_health_coverage', label: 'Mental Health', icon: '🧠' },
    { key: 'physiotherapy_coverage', label: 'Physiotherapy', icon: '🏋️' },
  ];

  return (
    <div className="comparison-container">
      <div className="comparison-header">
        <h2>Insurance Plans Comparison</h2>
        <button onClick={exportToPDF} className="export-pdf-btn">
          📄 Export to PDF
        </button>
      </div>

      {userProfile && (
        <div className="user-profile-banner">
          <strong>Your Profile:</strong> Age: {userProfile.age} | 
          Salary: AED {userProfile.monthly_salary?.toLocaleString()}/month | 
          Coverage: {userProfile.coverage_type || 'Individual'}
        </div>
      )}

      <div className="comparison-table-wrapper" ref={tableRef}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="sticky-col">Criteria</th>
              {providers.map(provider => (
                <th key={provider} className="provider-header">
                  <div className="provider-header-content">
                    <strong>{provider}</strong>
                    <select
                      value={selectedPlans[provider] || ''}
                      onChange={(e) => handlePlanChange(provider, e.target.value)}
                      className="plan-selector"
                    >
                      {getProviderPlans(provider).map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.plan_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* AI Recommendation Row */}
            {userProfile && (
              <tr className="recommendation-row">
                <td className="sticky-col category-label">
                  <strong>🤖 AI Recommendation</strong>
                </td>
                {providers.map(provider => {
                  const plan = getSelectedPlan(provider);
                  const recommendation = plan ? getAIRecommendation(plan) : null;
                  return (
                    <td key={provider} className={recommendation?.recommended ? 'recommended' : ''}>
                      {recommendation ? (
                        <div className="recommendation-cell">
                          <div className="score-badge">Score: {recommendation.score}/100</div>
                          <div className="affordability">{recommendation.affordabilityRatio}% of salary</div>
                          <ul className="recommendation-reasons">
                            {recommendation.reasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                          {recommendation.recommended && (
                            <span className="best-choice-badge">⭐ Best Choice</span>
                          )}
                        </div>
                      ) : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Pricing Section */}
            <tr className="section-header">
              <td colSpan={providers.length + 1}>💰 PRICING</td>
            </tr>
            <tr>
              <td className="sticky-col">Monthly Cost</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                return (
                  <td key={provider}>
                    {plan?.monthly_cost ? `AED ${parseFloat(plan.monthly_cost).toLocaleString()}` : 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">Annual Cost</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                return (
                  <td key={provider}>
                    {plan?.annual_cost ? `AED ${parseFloat(plan.annual_cost).toLocaleString()}` : 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">Deductible</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                return (
                  <td key={provider}>
                    {plan?.deductible ? `AED ${parseFloat(plan.deductible).toLocaleString()}` : 'None'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">Maximum Coverage</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                return (
                  <td key={provider}>
                    {plan?.max_coverage ? `AED ${parseFloat(plan.max_coverage).toLocaleString()}` : 'N/A'}
                  </td>
                );
              })}
            </tr>

            {/* Age-Based Pricing */}
            {userProfile?.age && (
              <tr>
                <td className="sticky-col">Your Age Premium</td>
                {providers.map(provider => {
                  const plan = getSelectedPlan(provider);
                  const agePricing = plan ? parseAgePricing(plan) : [];
                  const match = agePricing.find(ap => {
                    const [min, max] = ap.age_range.split('-').map(x => parseInt(x));
                    return userProfile.age >= min && userProfile.age <= max;
                  });
                  return (
                    <td key={provider}>
                      {match ? `AED ${match.premium.toLocaleString()}/year` : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Benefits Section */}
            <tr className="section-header">
              <td colSpan={providers.length + 1}>📋 BENEFITS & COVERAGE</td>
            </tr>
            {benefitCategories.map(benefit => (
              <tr key={benefit.key}>
                <td className="sticky-col">
                  {benefit.icon} {benefit.label}
                </td>
                {providers.map(provider => {
                  const plan = getSelectedPlan(provider);
                  const features = plan ? parseStructuredFeatures(plan) : {};
                  const value = features[benefit.key];
                  return (
                    <td key={provider} className={value ? 'covered' : 'not-covered'}>
                      {value === true ? '✓ Covered' : value === false ? '✗ Not Covered' : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Additional Features */}
            <tr className="section-header">
              <td colSpan={providers.length + 1}>⚡ ADDITIONAL FEATURES</td>
            </tr>
            <tr>
              <td className="sticky-col">🌍 Coverage Area</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                const features = plan ? parseStructuredFeatures(plan) : {};
                const areas = [];
                if (features.uae_coverage) areas.push('UAE');
                if (features.gcc_coverage) areas.push('GCC');
                if (features.international_coverage) areas.push('International');
                return (
                  <td key={provider}>
                    {areas.length > 0 ? areas.join(', ') : 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">🏥 Hospital Network</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                const features = plan ? parseStructuredFeatures(plan) : {};
                return (
                  <td key={provider}>
                    {features.network_hospitals_count ? 
                      `${features.network_hospitals_count} hospitals` : 
                      features.network_type || 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">💳 Cashless Claims</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                const features = plan ? parseStructuredFeatures(plan) : {};
                return (
                  <td key={provider} className={features.cashless_claims ? 'covered' : 'not-covered'}>
                    {features.cashless_claims === true ? '✓ Available' : 
                     features.cashless_claims === false ? '✗ Not Available' : 'N/A'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">⏳ Waiting Period</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                const features = plan ? parseStructuredFeatures(plan) : {};
                return (
                  <td key={provider}>
                    {features.waiting_period_days ? `${features.waiting_period_days} days` : 'None'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">💰 Co-payment</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                const features = plan ? parseStructuredFeatures(plan) : {};
                return (
                  <td key={provider}>
                    {features.copay_percentage ? `${features.copay_percentage}%` : 'None'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="sticky-col">🛏️ Room Type</td>
              {providers.map(provider => {
                const plan = getSelectedPlan(provider);
                const features = plan ? parseStructuredFeatures(plan) : {};
                return (
                  <td key={provider}>
                    {features.room_type || 'N/A'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;
