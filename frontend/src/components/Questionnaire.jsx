import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Questionnaire.css';

const Questionnaire = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    insuranceType: '',
    coverageType: '',
    monthlySalary: '',
    maxMonthlyBudget: '',
    maxDeductible: '',
    minCoverage: '',
  });

  const insuranceTypes = ['Health', 'Auto', 'Life', 'Property', 'Travel'];
  
  const coverageTypes = {
    Health: ['Individual', 'Family', 'Senior'],
    Auto: ['Comprehensive', 'Third Party', 'Third Party Fire & Theft'],
    Life: ['Term Life', 'Whole Life', 'Universal Life'],
    Property: ['Home', 'Renters', 'Commercial'],
    Travel: ['Single Trip', 'Annual Multi-Trip', 'Family'],
  };

  const handleChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    
    // If monthly salary changes, auto-calculate recommended budget (1/10 of annual salary monthly)
    if (field === 'monthlySalary' && value) {
      const annualSalary = parseFloat(value) * 12;
      const recommendedAnnualBudget = annualSalary / 10;
      const recommendedMonthlyBudget = Math.round(recommendedAnnualBudget / 12);
      updatedData.maxMonthlyBudget = recommendedMonthlyBudget.toString();
    }
    
    setFormData(updatedData);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    // Navigate to comparison page with query parameters
    const filters = {
      type: formData.insuranceType,
      coverage_type: formData.coverageType,
      max_cost: formData.maxMonthlyBudget,
      max_deductible: formData.maxDeductible,
      min_coverage: formData.minCoverage,
      state_id: user.state.id,
    };
    
    // Pass filters as state
    navigate('/compare', { state: { filters } });
  };

  const isStepValid = () => {
    if (step === 1) return formData.insuranceType !== '';
    if (step === 2) return formData.coverageType !== '';
    if (step === 3) return formData.maxMonthlyBudget !== '';
    return false;
  };

  return (
    <div className="questionnaire-container">
      <div className="questionnaire-card">
        <div className="questionnaire-header">
          <h1>Find Your Perfect Insurance Plan</h1>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
          <p className="step-indicator">Step {step} of 3</p>
        </div>

        <div className="questionnaire-content">
          {step === 1 && (
            <div className="step-content">
              <h2>What type of insurance are you looking for?</h2>
              <div className="options-grid">
                {insuranceTypes.map((type) => (
                  <button
                    key={type}
                    className={`option-card ${formData.insuranceType === type ? 'selected' : ''}`}
                    onClick={() => handleChange('insuranceType', type)}
                  >
                    <div className="option-icon">
                      {type === 'Health' && '🏥'}
                      {type === 'Auto' && '🚗'}
                      {type === 'Life' && '❤️'}
                      {type === 'Property' && '🏠'}
                      {type === 'Travel' && '✈️'}
                    </div>
                    <div className="option-name">{type}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h2>What coverage type do you need?</h2>
              <div className="options-grid">
                {coverageTypes[formData.insuranceType]?.map((type) => (
                  <button
                    key={type}
                    className={`option-card ${formData.coverageType === type ? 'selected' : ''}`}
                    onClick={() => handleChange('coverageType', type)}
                  >
                    <div className="option-name">{type}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <h2>Tell us about your budget and coverage needs</h2>
              <div className="form-fields">
                <div className="form-field">
                  <label>Monthly Salary (AED)</label>
                  <input
                    type="number"
                    value={formData.monthlySalary}
                    onChange={(e) => handleChange('monthlySalary', e.target.value)}
                    placeholder="e.g., 10000"
                    min="0"
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                    We'll recommend a budget of ~1/10 of your annual salary
                  </small>
                </div>

                <div className="form-field">
                  <label>Maximum Monthly Budget (AED)</label>
                  <input
                    type="number"
                    value={formData.maxMonthlyBudget}
                    onChange={(e) => handleChange('maxMonthlyBudget', e.target.value)}
                    placeholder="Auto-calculated based on salary"
                    min="0"
                  />
                  {formData.monthlySalary && formData.maxMonthlyBudget && (
                    <small style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                      ✓ Recommended: AED {formData.maxMonthlyBudget}/month (10% of annual salary)
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label>Maximum Deductible (AED) - Optional</label>
                  <input
                    type="number"
                    value={formData.maxDeductible}
                    onChange={(e) => handleChange('maxDeductible', e.target.value)}
                    placeholder="e.g., 5000"
                    min="0"
                  />
                </div>

                <div className="form-field">
                  <label>Minimum Coverage Amount (AED) - Optional</label>
                  <input
                    type="number"
                    value={formData.minCoverage}
                    onChange={(e) => handleChange('minCoverage', e.target.value)}
                    placeholder="e.g., 100000"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="questionnaire-actions">
          <button
            className="btn-back"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </button>
          
          {step < 3 ? (
            <button
              className="btn-next"
              onClick={handleNext}
              disabled={!isStepValid()}
            >
              Next
            </button>
          ) : (
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={!isStepValid()}
            >
              Find Plans
            </button>
          )}
        </div>

        <button
          className="btn-home"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default Questionnaire;
