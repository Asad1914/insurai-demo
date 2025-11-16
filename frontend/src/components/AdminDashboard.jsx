import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, authAPI } from '../services/api';
import ProviderDetailView from './ProviderDetailView';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [providerName, setProviderName] = useState('');
  const [newProviderName, setNewProviderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [filteredPlans, setFilteredPlans] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchStates();
    fetchPlans();
  }, []);

  useEffect(() => {
    // Filter plans when provider selection changes
    if (selectedProvider === '') {
      setFilteredPlans(plans);
    } else {
      setFilteredPlans(plans.filter(plan => plan.provider_name === selectedProvider));
    }
  }, [selectedProvider, plans]);

  const fetchStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStates = async () => {
    try {
      const data = await authAPI.getStates();
      setStates(data.states);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const data = await adminAPI.getPlans();
      setPlans(data.plans);
      
      // Extract unique providers
      const uniqueProviders = [...new Set(data.plans.map(plan => plan.provider_name))].sort();
      setProviders(uniqueProviders);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Check file types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        setUploadStatus({
          type: 'error',
          message: `Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Please upload only PDF, Word, or Excel files.`,
        });
        setSelectedFiles([]);
      } else {
        setSelectedFiles(files);
        setUploadStatus({ type: '', message: '' });
      }
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !selectedState) {
      setUploadStatus({
        type: 'error',
        message: 'Please select both file(s) and a state.',
      });
      return;
    }

    // Determine the actual provider name to use
    const actualProviderName = providerName === '__new__' ? newProviderName : providerName;

    if (!actualProviderName || actualProviderName.trim() === '') {
      setUploadStatus({
        type: 'error',
        message: 'Please select an existing company or enter a new company name.',
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ 
      type: 'info', 
      message: `Uploading and processing ${selectedFiles.length} file(s) for ${actualProviderName}...` 
    });

    try {
      const result = await adminAPI.uploadPlans(selectedFiles, selectedState, actualProviderName);
      
      let message = `Processed ${result.results.total_files} file(s): `;
      message += `${result.results.successful} successful, ${result.results.failed} failed. `;
      message += `Total plans added/updated: ${result.total_plans_added}`;
      
      setUploadStatus({
        type: result.results.failed > 0 ? 'warning' : 'success',
        message: message,
      });
      
      setSelectedFiles([]);
      setSelectedState('');
      setProviderName('');
      setNewProviderName('');
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

      // Refresh data
      fetchStats();
      fetchPlans();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.details || 'Failed to upload and process files.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePlan = async (planId, currentStatus) => {
    try {
      await adminAPI.updatePlan(planId, { is_active: !currentStatus });
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await adminAPI.deletePlan(planId);
        fetchPlans();
        fetchStats();
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="nav-brand">InsurAI Admin</div>
        <div className="nav-actions">
          <span className="admin-name">Admin: {user?.full_name}</span>
          <button onClick={() => navigate('/')} className="btn-nav">User View</button>
          <button onClick={handleLogout} className="btn-nav">Logout</button>
        </div>
      </nav>

      <div className="admin-content">
        <h1 className="admin-title">Admin Dashboard</h1>

        {/* Statistics */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{stats.overview.total_users}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-value">{stats.overview.active_plans}</div>
              <div className="stat-label">Active Plans</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏢</div>
              <div className="stat-value">{stats.overview.total_providers}</div>
              <div className="stat-label">Providers</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-value">{stats.overview.total_chats}</div>
              <div className="stat-label">Total Conversations</div>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="upload-section">
          <h2>Upload Insurance Plans</h2>
          <p className="upload-description">
            Upload PDF, Word, or Excel files containing insurance plan information.
            AI will automatically extract and structure the data.
          </p>

          <div className="upload-form">
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Select State/Emirate *</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">Choose emirate...</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.state_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Select Insurance Company *</label>
                <select
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  disabled={uploading}
                  className="provider-select"
                >
                  <option value="">Choose existing or type new below...</option>
                  {providers.length > 0 && (
                    <optgroup label="Existing Companies">
                      {providers.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__new__">➕ Add New Insurance Company</option>
                </select>
              </div>
            </div>

            {providerName === '__new__' && (
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>New Insurance Company Name *</label>
                  <input
                    type="text"
                    value={newProviderName}
                    onChange={(e) => setNewProviderName(e.target.value)}
                    placeholder="e.g., ADNIC, UIFC, Aafiya"
                    disabled={uploading}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Select Files (PDF, Word, Excel) - Multiple files supported *</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  disabled={uploading}
                  multiple
                />
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="file-info">
                <div><strong>Selected {selectedFiles.length} file(s):</strong></div>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <span>📄 {file.name}</span>
                    <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ))}
                <div className="total-size">
                  Total size: {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}

            {uploadStatus.message && (
              <div className={`upload-status ${uploadStatus.type}`}>
                {uploadStatus.message}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0 || !selectedState || (!providerName || (providerName === '__new__' && !newProviderName.trim()))}
              className="btn-upload"
            >
              {uploading 
                ? 'Processing...' 
                : `Upload to ${providerName === '__new__' ? (newProviderName || 'New Company') : (providerName || 'Selected Company')} ${selectedFiles.length > 0 ? `(${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''})` : ''}`
              }
            </button>
          </div>
        </div>

        {/* Insurance Companies Management */}
        <div className="plans-section">
          <div className="plans-header">
            <h2>Insurance Companies</h2>
          </div>
          
          {loadingPlans ? (
            <div className="loading">Loading insurance companies...</div>
          ) : selectedProvider ? (
            /* Show detailed view when a provider is selected */
            <div>
              <button 
                className="back-button"
                onClick={() => setSelectedProvider('')}
                style={{
                  marginBottom: '20px',
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ← Back to Insurance Companies
              </button>
              <ProviderDetailView 
                plans={filteredPlans} 
                providerName={selectedProvider}
              />
            </div>
          ) : (
            /* Show insurance companies table */
            <div className="plans-table-container">
              {providers.length === 0 ? (
                <div className="no-plans">
                  No insurance companies available. Upload some documents to get started.
                </div>
              ) : (
                <>
                  <div className="plans-summary">
                    Total: {providers.length} Insurance Compan{providers.length !== 1 ? 'ies' : 'y'} | {plans.length} Plan{plans.length !== 1 ? 's' : ''}
                  </div>
                  <table className="plans-table">
                    <thead>
                      <tr>
                        <th>Insurance Company</th>
                        <th>Number of Plans</th>
                        <th>Total Active Plans</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((provider) => {
                        const providerPlans = plans.filter(p => p.provider_name === provider);
                        const totalPlans = providerPlans.length;
                        const activePlans = providerPlans.filter(p => p.is_active).length;
                        
                        return (
                          <tr key={provider}>
                            <td>
                              <strong style={{ fontSize: '16px' }}>{provider}</strong>
                            </td>
                            <td>
                              <span className="type-badge">{totalPlans}</span>
                            </td>
                            <td>
                              <span className={`status-badge ${activePlans > 0 ? 'active' : 'inactive'}`}>
                                {activePlans} Active
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => setSelectedProvider(provider)}
                                  className="btn-view"
                                  style={{
                                    padding: '6px 16px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                  }}
                                >
                                  View Details →
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
