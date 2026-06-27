// Integrations Platform Frontend Application
// Prompt 25: Integration Platform

class IntegrationsApp {
  constructor() {
    this.integrations = [];
    this.currentIntegration = null;
    this.filters = {
      search: '',
      provider: '',
      status: ''
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadIntegrations();
    this.loadStatistics();
  }

  bindEvents() {
    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.loadIntegrations();
    });

    // Provider filter
    document.getElementById('provider-filter')?.addEventListener('change', (e) => {
      this.filters.provider = e.target.value;
      this.loadIntegrations();
    });

    // Status filter
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.loadIntegrations();
    });

    // Form submission
    document.getElementById('integration-form')?.addEventListener('submit', (e) => {
      this.saveIntegration(e);
    });

    // Credential form submission
    document.getElementById('credential-form')?.addEventListener('submit', (e) => {
      this.saveCredential(e);
    });
  }

  // ─── Load Integrations ───────────────────────────────────────────────────────

  async loadIntegrations() {
    try {
      const params = new URLSearchParams();
      if (this.filters.search) params.append('search', this.filters.search);
      if (this.filters.provider) params.append('provider', this.filters.provider);
      if (this.filters.status) params.append('status', this.filters.status);
      params.append('limit', '100');

      const response = await fetch(`/api/integrations?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        this.integrations = result.data;
        this.renderIntegrations();
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
      this.showError('Failed to load integrations');
    }
  }

  async loadStatistics() {
    try {
      const response = await fetch('/api/integrations/statistics');
      const result = await response.json();

      if (result.success) {
        this.updateStatistics(result.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }

  updateStatistics(stats) {
    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-active').textContent = stats.active || 0;
    document.getElementById('stat-error').textContent = stats.error || 0;
    document.getElementById('stat-healthy').textContent = stats.health?.healthy || 0;
  }

  // ─── Render Integrations ─────────────────────────────────────────────────────

  renderIntegrations() {
    const grid = document.getElementById('integrations-grid');
    const emptyState = document.getElementById('empty-state');

    if (this.integrations.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = this.integrations.map(integration => this.renderIntegrationCard(integration)).join('');
  }

  renderIntegrationCard(integration) {
    const statusClass = `status-${integration.status}`;
    const lastSync = integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleDateString() : 'Never';
    const icon = this.getProviderIcon(integration.provider);

    return `
      <div class="integration-card" onclick="app.viewIntegration('${integration.id}')">
        <div class="integration-card-header">
          <div class="integration-icon">${icon}</div>
          <span class="integration-status ${statusClass}">${integration.status}</span>
        </div>
        
        <div class="integration-name">${this.escapeHtml(integration.displayName)}</div>
        <div class="integration-provider">${this.escapeHtml(integration.provider)}</div>
        <div class="integration-description">${this.escapeHtml(integration.description || 'No description')}</div>
        
        <div class="integration-meta">
          <div class="meta-item">
            <span>🔄</span>
            <span>Last sync: ${lastSync}</span>
          </div>
          <div class="meta-item">
            <span>🔐</span>
            <span>${this.escapeHtml(integration.authType)}</span>
          </div>
        </div>

        <div class="integration-actions">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.testConnection('${integration.id}')">
            Test
          </button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.showCredentialModal('${integration.id}')">
            Credentials
          </button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.deleteIntegration('${integration.id}')">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  getProviderIcon(provider) {
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
      notion: '📝',
      salesforce: '☁️',
      hubspot: '🎯',
      servicenow: '🎫',
      sap: '🏢',
      oracle: '🗄️',
      twilio: '📱',
      whatsapp: '💚',
      telegram: '✈️',
      discord: '🎮',
      custom: '⚙️'
    };
    return icons[provider] || '🔌';
  }

  // ─── Modal Management ────────────────────────────────────────────────────────

  showNewIntegrationModal() {
    document.getElementById('modal-title').textContent = 'New Integration';
    document.getElementById('integration-form').reset();
    document.getElementById('integration-modal').classList.add('active');
  }

  closeModal() {
    document.getElementById('integration-modal').classList.remove('active');
  }

  showCredentialModal(integrationId) {
    document.getElementById('credential-integration-id').value = integrationId;
    document.getElementById('credential-form').reset();
    document.getElementById('credential-modal').classList.add('active');
  }

  closeCredentialModal() {
    document.getElementById('credential-modal').classList.remove('active');
  }

  // ─── CRUD Operations ─────────────────────────────────────────────────────────

  async saveIntegration(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    
    const integrationData = {
      name: formData.get('name'),
      displayName: formData.get('displayName') || formData.get('name'),
      description: formData.get('description'),
      provider: formData.get('provider'),
      integrationType: formData.get('integrationType'),
      authType: formData.get('authType'),
      configuration: this.parseJson(formData.get('configuration'))
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
        this.closeModal();
        this.loadIntegrations();
        this.loadStatistics();
        this.showSuccess('Integration created successfully');
      } else {
        this.showError(result.error || 'Failed to create integration');
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
      this.showError('Failed to save integration');
    }
  }

  async deleteIntegration(integrationId) {
    if (!confirm('Are you sure you want to delete this integration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.loadIntegrations();
        this.loadStatistics();
        this.showSuccess('Integration deleted successfully');
      } else {
        this.showError(result.error || 'Failed to delete integration');
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
      this.showError('Failed to delete integration');
    }
  }

  async viewIntegration(integrationId) {
    // Navigate to integration detail page
    window.location.href = `/integrations/${integrationId}`;
  }

  // ─── Credential Management ───────────────────────────────────────────────────

  async saveCredential(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const integrationId = formData.get('integrationId');

    const credentialData = {
      type: formData.get('type'),
      value: formData.get('value'),
      expiresAt: formData.get('expiresAt') || null
    };

    try {
      const response = await fetch(`/api/integrations/${integrationId}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentialData)
      });

      const result = await response.json();

      if (result.success) {
        this.closeCredentialModal();
        this.showSuccess('Credential saved successfully');
      } else {
        this.showError(result.error || 'Failed to save credential');
      }
    } catch (error) {
      console.error('Failed to save credential:', error);
      this.showError('Failed to save credential');
    }
  }

  // ─── Connection Testing ──────────────────────────────────────────────────────

  async testConnection(integrationId) {
    try {
      this.showLoading('Testing connection...');

      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST'
      });

      const result = await response.json();

      this.hideLoading();

      if (result.success) {
        this.showSuccess('Connection test successful!');
        this.loadIntegrations();
      } else {
        this.showError(result.error || 'Connection test failed');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Failed to test connection:', error);
      this.showError('Failed to test connection');
    }
  }

  async checkAllHealth() {
    try {
      this.showLoading('Checking health of all integrations...');

      const response = await fetch('/api/integrations/health/check-all', {
        method: 'POST'
      });

      const result = await response.json();

      this.hideLoading();

      if (result.success) {
        this.showSuccess(`Health check completed for ${result.data.length} integrations`);
        this.loadIntegrations();
        this.loadStatistics();
      } else {
        this.showError(result.error || 'Health check failed');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Failed to check health:', error);
      this.showError('Failed to check health');
    }
  }

  // ─── Utility Methods ─────────────────────────────────────────────────────────

  parseJson(str) {
    try {
      return str ? JSON.parse(str) : {};
    } catch {
      return {};
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Simple notification - can be enhanced with a proper notification system
    alert(message);
  }

  showLoading(message = 'Loading...') {
    // Implement loading indicator
    console.log(message);
  }

  hideLoading() {
    // Hide loading indicator
  }

  onProviderChange() {
    // Handle provider change - can be used to load provider-specific configuration
    const provider = document.getElementById('integration-provider').value;
    console.log('Provider changed:', provider);
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new IntegrationsApp();
});