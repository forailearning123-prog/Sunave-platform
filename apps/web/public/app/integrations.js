// Integration Framework Frontend
// Epic 5: Plugin SDK & Integration Platform

// ─── State Management ─────────────────────────────────────────────────────────

const state = {
  integrations: [],
  selectedIntegration: null
};

// ─── Initialization ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initializeFilters();
  initializeModals();
  loadIntegrations();
});

// ─── Filter Management ────────────────────────────────────────────────────────

function initializeFilters() {
  document.getElementById('integrations-search')?.addEventListener('input', debounce(loadIntegrations, 300));
  document.getElementById('integrations-provider-filter')?.addEventListener('change', loadIntegrations);
  document.getElementById('integrations-status-filter')?.addEventListener('change', loadIntegrations);
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadIntegrations() {
  const search = document.getElementById('integrations-search')?.value || '';
  const provider = document.getElementById('integrations-provider-filter')?.value || '';
  const status = document.getElementById('integrations-status-filter')?.value || '';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (provider) params.append('provider', provider);
    if (status) params.append('status', status);

    const response = await fetch(`/api/integrations?${params}`);
    const result = await response.json();

    if (result.success) {
      state.integrations = result.data;
      renderIntegrations();
    }
  } catch (error) {
    console.error('Failed to load integrations:', error);
    showError('Failed to load integrations');
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderIntegrations() {
  const grid = document.getElementById('integrations-grid');
  if (!grid) return;

  if (state.integrations.length === 0) {
    grid.innerHTML = '<div class="empty-state">No integrations found</div>';
    return;
  }

  grid.innerHTML = state.integrations.map(integration => `
    <div class="plugin-card" onclick="showIntegrationDetails('${integration.id}')">
      <div class="plugin-icon">${getProviderIcon(integration.provider)}</div>
      <div class="plugin-info">
        <h3>${integration.displayName || integration.name}</h3>
        <p class="plugin-description">${integration.description?.substring(0, 100) || ''}</p>
        <div class="plugin-meta">
          <span class="plugin-category">${integration.provider}</span>
          <span class="plugin-status status-${integration.status}">${integration.status}</span>
          <span class="plugin-type">${integration.integrationType}</span>
        </div>
      </div>
      <div class="plugin-actions">
        <button class="btn btn-sm ${integration.isEnabled ? 'btn-warning' : 'btn-success'}" 
                onclick="event.stopPropagation(); toggleIntegration('${integration.id}', ${integration.isEnabled})">
          ${integration.isEnabled ? 'Disable' : 'Enable'}
        </button>
        <button class="btn btn-sm btn-primary" 
                onclick="event.stopPropagation(); testIntegration('${integration.id}')">
          Test
        </button>
        <button class="btn btn-sm btn-danger" 
                onclick="event.stopPropagation(); deleteIntegration('${integration.id}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

function getProviderIcon(provider) {
  const icons = {
    github: '🐙',
    gitlab: '🦊',
    azure_devops: '📦',
    jira: '📋',
    confluence: '📚',
    slack: '💬',
    microsoft_teams: '👥',
    google_workspace: '📧',
    microsoft_365: '📊',
    outlook: '📧',
    gmail: '📧',
    sap: '🏢',
    salesforce: '☁️',
    hubspot: '🎯',
    servicenow: '📝',
    twilio: '📱',
    whatsapp: '💚',
    telegram: '✈️',
    discord: '🎮',
    custom: '🔧'
  };
  return icons[provider] || '🔌';
}

// ─── Integration Actions ──────────────────────────────────────────────────────

async function toggleIntegration(integrationId, isEnabled) {
  const action = isEnabled ? 'disable' : 'enable';
  
  if (!confirm(`Are you sure you want to ${action} this integration?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/integrations/${integrationId}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      showSuccess(`Integration ${action}d successfully`);
      loadIntegrations();
    } else {
      showError(result.error || `Failed to ${action} integration`);
    }
  } catch (error) {
    console.error(`Failed to ${action} integration:`, error);
    showError(`Failed to ${action} integration`);
  }
}

async function testIntegration(integrationId) {
  try {
    showSuccess('Testing connection...');
    
    const response = await fetch(`/api/integrations/${integrationId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Connection test successful!');
    } else {
      showError(result.error || 'Connection test failed');
    }
  } catch (error) {
    console.error('Failed to test integration:', error);
    showError('Failed to test integration');
  }
}

async function deleteIntegration(integrationId) {
  if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/integrations/${integrationId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Integration deleted successfully');
      loadIntegrations();
    } else {
      showError(result.error || 'Failed to delete integration');
    }
  } catch (error) {
    console.error('Failed to delete integration:', error);
    showError('Failed to delete integration');
  }
}

// ─── Modal Management ─────────────────────────────────────────────────────────

function initializeModals() {
  document.getElementById('create-integration-form')?.addEventListener('submit', handleCreateIntegration);
}

function openCreateIntegrationModal() {
  document.getElementById('create-integration-modal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

async function handleCreateIntegration(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const integrationData = {
    name: formData.get('name'),
    displayName: formData.get('name'),
    description: formData.get('description'),
    provider: formData.get('provider'),
    integrationType: formData.get('integrationType'),
    authType: formData.get('authType'),
    configuration: {}
  };

  try {
    const response = await fetch('/api/integrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationData)
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Integration created successfully');
      closeModal('create-integration-modal');
      event.target.reset();
      loadIntegrations();
    } else {
      showError(result.error || 'Failed to create integration');
    }
  } catch (error) {
    console.error('Failed to create integration:', error);
    showError('Failed to create integration');
  }
}

// ─── Integration Details ──────────────────────────────────────────────────────

async function showIntegrationDetails(integrationId) {
  try {
    const response = await fetch(`/api/integrations/${integrationId}`);
    const result = await response.json();

    if (result.success) {
      state.selectedIntegration = result.data;
      renderIntegrationDetails(result.data);
      document.getElementById('integration-details-modal').classList.add('active');
    } else {
      showError(result.error || 'Failed to load integration details');
    }
  } catch (error) {
    console.error('Failed to load integration details:', error);
    showError('Failed to load integration details');
  }
}

function renderIntegrationDetails(integration) {
  const title = document.getElementById('integration-details-title');
  const content = document.getElementById('integration-details-content');

  title.textContent = integration.displayName || integration.name;

  content.innerHTML = `
    <div class="plugin-details">
      <div class="detail-section">
        <h3>Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Name:</label>
            <span>${integration.name}</span>
          </div>
          <div class="detail-item">
            <label>Provider:</label>
            <span>${integration.provider}</span>
          </div>
          <div class="detail-item">
            <label>Type:</label>
            <span>${integration.integrationType}</span>
          </div>
          <div class="detail-item">
            <label>Auth Type:</label>
            <span>${integration.authType}</span>
          </div>
          <div class="detail-item">
            <label>Status:</label>
            <span class="status-${integration.status}">${integration.status}</span>
          </div>
          <div class="detail-item">
            <label>Enabled:</label>
            <span>${integration.isEnabled ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Description</h3>
        <p>${integration.description || 'No description provided'}</p>
      </div>

      ${integration.lastSyncAt ? `
        <div class="detail-section">
          <h3>Sync Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Last Sync:</label>
              <span>${new Date(integration.lastSyncAt).toLocaleString()}</span>
            </div>
            ${integration.lastErrorAt ? `
              <div class="detail-item">
                <label>Last Error:</label>
                <span class="error">${new Date(integration.lastErrorAt).toLocaleString()}</span>
              </div>
            ` : ''}
          </div>
          ${integration.lastErrorMessage ? `
            <p class="error-message">${integration.lastErrorMessage}</p>
          ` : ''}
        </div>
      ` : ''}

      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="closeModal('integration-details-modal')">Close</button>
        <button class="btn btn-primary" onclick="testIntegration('${integration.id}'); closeModal('integration-details-modal');">
          Test Connection
        </button>
      </div>
    </div>
  `;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showSuccess(message) {
  alert(`Success: ${message}`);
}

function showError(message) {
  alert(`Error: ${message}`);
}