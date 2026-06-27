// Plugin Platform Frontend
// Epic 5: Plugin SDK & Integration Platform

// ─── State Management ─────────────────────────────────────────────────────────

const state = {
  currentTab: 'installed',
  installedPlugins: [],
  myPlugins: [],
  marketplaceItems: [],
  selectedPlugin: null
};

// ─── Initialization ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeFilters();
  initializeModals();
  loadInstalledPlugins();
  loadMyPlugins();
  loadMarketplaceItems();
});

// ─── Tab Management ───────────────────────────────────────────────────────────

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });

  state.currentTab = tabName;

  // Load data for the tab
  switch (tabName) {
    case 'installed':
      loadInstalledPlugins();
      break;
    case 'my-plugins':
      loadMyPlugins();
      break;
    case 'marketplace':
      loadMarketplaceItems();
      break;
  }
}

// ─── Filter Management ────────────────────────────────────────────────────────

function initializeFilters() {
  // Installed plugins filters
  document.getElementById('installed-search')?.addEventListener('input', debounce(loadInstalledPlugins, 300));
  document.getElementById('installed-status-filter')?.addEventListener('change', loadInstalledPlugins);

  // My plugins filters
  document.getElementById('my-plugins-search')?.addEventListener('input', debounce(loadMyPlugins, 300));
  document.getElementById('my-plugins-category-filter')?.addEventListener('change', loadMyPlugins);

  // Marketplace filters
  document.getElementById('marketplace-search')?.addEventListener('input', debounce(loadMarketplaceItems, 300));
  document.getElementById('marketplace-category-filter')?.addEventListener('change', loadMarketplaceItems);
  document.getElementById('marketplace-sort')?.addEventListener('change', loadMarketplaceItems);
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadInstalledPlugins() {
  const search = document.getElementById('installed-search')?.value || '';
  const status = document.getElementById('installed-status-filter')?.value || '';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const response = await fetch(`/api/plugins?${params}`);
    const result = await response.json();

    if (result.success) {
      state.installedPlugins = result.data;
      renderInstalledPlugins();
    }
  } catch (error) {
    console.error('Failed to load installed plugins:', error);
    showError('Failed to load installed plugins');
  }
}

async function loadMyPlugins() {
  const search = document.getElementById('my-plugins-search')?.value || '';
  const category = document.getElementById('my-plugins-category-filter')?.value || '';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    const response = await fetch(`/api/plugins?${params}`);
    const result = await response.json();

    if (result.success) {
      state.myPlugins = result.data;
      renderMyPlugins();
    }
  } catch (error) {
    console.error('Failed to load my plugins:', error);
    showError('Failed to load my plugins');
  }
}

async function loadMarketplaceItems() {
  const search = document.getElementById('marketplace-search')?.value || '';
  const category = document.getElementById('marketplace-category-filter')?.value || '';
  const sort = document.getElementById('marketplace-sort')?.value || 'featured';

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    params.append('sort', sort);

    const response = await fetch(`/api/marketplace/items?${params}`);
    const result = await response.json();

    if (result.success) {
      state.marketplaceItems = result.data;
      renderMarketplaceItems();
    }
  } catch (error) {
    console.error('Failed to load marketplace items:', error);
    showError('Failed to load marketplace items');
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderInstalledPlugins() {
  const grid = document.getElementById('installed-plugins-grid');
  if (!grid) return;

  if (state.installedPlugins.length === 0) {
    grid.innerHTML = '<div class="empty-state">No installed plugins found</div>';
    return;
  }

  grid.innerHTML = state.installedPlugins.map(plugin => `
    <div class="plugin-card" onclick="showPluginDetails('${plugin.id}')">
      <div class="plugin-icon">${plugin.icon || 'puzzle'}</div>
      <div class="plugin-info">
        <h3>${plugin.displayName || plugin.name}</h3>
        <p class="plugin-description">${plugin.description?.substring(0, 100) || ''}</p>
        <div class="plugin-meta">
          <span class="plugin-version">v${plugin.installedVersion || plugin.version}</span>
          <span class="plugin-status status-${plugin.status}">${plugin.status}</span>
        </div>
      </div>
      <div class="plugin-actions">
        <button class="btn btn-sm ${plugin.status === 'enabled' ? 'btn-warning' : 'btn-success'}" 
                onclick="event.stopPropagation(); togglePlugin('${plugin.id}', '${plugin.status}')">
          ${plugin.status === 'enabled' ? 'Disable' : 'Enable'}
        </button>
        <button class="btn btn-sm btn-danger" 
                onclick="event.stopPropagation(); uninstallPlugin('${plugin.id}')">
          Uninstall
        </button>
      </div>
    </div>
  `).join('');
}

function renderMyPlugins() {
  const grid = document.getElementById('my-plugins-grid');
  if (!grid) return;

  if (state.myPlugins.length === 0) {
    grid.innerHTML = '<div class="empty-state">No plugins found</div>';
    return;
  }

  grid.innerHTML = state.myPlugins.map(plugin => `
    <div class="plugin-card" onclick="showPluginDetails('${plugin.id}')">
      <div class="plugin-icon">${plugin.icon || 'puzzle'}</div>
      <div class="plugin-info">
        <h3>${plugin.displayName || plugin.name}</h3>
        <p class="plugin-description">${plugin.description?.substring(0, 100) || ''}</p>
        <div class="plugin-meta">
          <span class="plugin-category">${plugin.category}</span>
          <span class="plugin-status status-${plugin.status}">${plugin.status}</span>
        </div>
      </div>
      <div class="plugin-actions">
        ${plugin.status === 'draft' ? `
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); publishPlugin('${plugin.id}')">
            Publish
          </button>
        ` : ''}
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editPlugin('${plugin.id}')">
          Edit
        </button>
      </div>
    </div>
  `).join('');
}

function renderMarketplaceItems() {
  const grid = document.getElementById('marketplace-grid');
  if (!grid) return;

  if (state.marketplaceItems.length === 0) {
    grid.innerHTML = '<div class="empty-state">No marketplace items found</div>';
    return;
  }

  grid.innerHTML = state.marketplaceItems.map(item => `
    <div class="plugin-card" onclick="showMarketplaceItemDetails('${item.id}')">
      <div class="plugin-icon">${item.icon || 'puzzle'}</div>
      <div class="plugin-info">
        <h3>${item.name}</h3>
        <p class="plugin-description">${item.shortDescription?.substring(0, 100) || ''}</p>
        <div class="plugin-meta">
          <span class="plugin-category">${item.category}</span>
          <span class="plugin-rating">${'★'.repeat(Math.round(item.ratingAverage))} (${item.ratingCount})</span>
          <span class="plugin-installs">${item.installCount} installs</span>
        </div>
      </div>
      <div class="plugin-actions">
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); installFromMarketplace('${item.pluginId}')">
          Install
        </button>
      </div>
    </div>
  `).join('');
}

// ─── Plugin Actions ───────────────────────────────────────────────────────────

async function togglePlugin(installationId, currentStatus) {
  const action = currentStatus === 'enabled' ? 'disable' : 'enable';
  
  if (!confirm(`Are you sure you want to ${action} this plugin?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/plugins/${installationId}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      showSuccess(`Plugin ${action}d successfully`);
      loadInstalledPlugins();
    } else {
      showError(result.error || `Failed to ${action} plugin`);
    }
  } catch (error) {
    console.error(`Failed to ${action} plugin:`, error);
    showError(`Failed to ${action} plugin`);
  }
}

async function uninstallPlugin(installationId) {
  if (!confirm('Are you sure you want to uninstall this plugin? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/plugins/${installationId}/uninstall`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Plugin uninstalled successfully');
      loadInstalledPlugins();
    } else {
      showError(result.error || 'Failed to uninstall plugin');
    }
  } catch (error) {
    console.error('Failed to uninstall plugin:', error);
    showError('Failed to uninstall plugin');
  }
}

async function publishPlugin(pluginId) {
  if (!confirm('Are you sure you want to publish this plugin? It will be available in the marketplace.')) {
    return;
  }

  try {
    const response = await fetch(`/api/plugins/${pluginId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Plugin published successfully');
      loadMyPlugins();
    } else {
      showError(result.error || 'Failed to publish plugin');
    }
  } catch (error) {
    console.error('Failed to publish plugin:', error);
    showError('Failed to publish plugin');
  }
}

async function installFromMarketplace(pluginId) {
  try {
    const response = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pluginId,
        configuration: {}
      })
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Plugin installed successfully');
      loadInstalledPlugins();
      switchTab('installed');
    } else {
      showError(result.error || 'Failed to install plugin');
    }
  } catch (error) {
    console.error('Failed to install plugin:', error);
    showError('Failed to install plugin');
  }
}

// ─── Modal Management ─────────────────────────────────────────────────────────

function initializeModals() {
  // Create plugin form
  document.getElementById('create-plugin-form')?.addEventListener('submit', handleCreatePlugin);
}

function openCreatePluginModal() {
  document.getElementById('create-plugin-modal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

async function handleCreatePlugin(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const pluginData = {
    name: formData.get('name'),
    displayName: formData.get('displayName'),
    description: formData.get('description'),
    category: formData.get('category'),
    version: formData.get('version'),
    entryPoint: formData.get('entryPoint')
  };

  try {
    const response = await fetch('/api/plugins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pluginData)
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Plugin created successfully');
      closeModal('create-plugin-modal');
      event.target.reset();
      loadMyPlugins();
      switchTab('my-plugins');
    } else {
      showError(result.error || 'Failed to create plugin');
    }
  } catch (error) {
    console.error('Failed to create plugin:', error);
    showError('Failed to create plugin');
  }
}

// ─── Plugin Details ───────────────────────────────────────────────────────────

async function showPluginDetails(pluginId) {
  try {
    const response = await fetch(`/api/plugins/${pluginId}`);
    const result = await response.json();

    if (result.success) {
      state.selectedPlugin = result.data;
      renderPluginDetails(result.data);
      document.getElementById('plugin-details-modal').classList.add('active');
    } else {
      showError(result.error || 'Failed to load plugin details');
    }
  } catch (error) {
    console.error('Failed to load plugin details:', error);
    showError('Failed to load plugin details');
  }
}

function renderPluginDetails(plugin) {
  const title = document.getElementById('plugin-details-title');
  const content = document.getElementById('plugin-details-content');

  title.textContent = plugin.displayName || plugin.name;

  content.innerHTML = `
    <div class="plugin-details">
      <div class="detail-section">
        <h3>Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Name:</label>
            <span>${plugin.name}</span>
          </div>
          <div class="detail-item">
            <label>Version:</label>
            <span>${plugin.version}</span>
          </div>
          <div class="detail-item">
            <label>Category:</label>
            <span>${plugin.category}</span>
          </div>
          <div class="detail-item">
            <label>Status:</label>
            <span class="status-${plugin.status}">${plugin.status}</span>
          </div>
          <div class="detail-item">
            <label>Author:</label>
            <span>${plugin.author}</span>
          </div>
          <div class="detail-item">
            <label>License:</label>
            <span>${plugin.license}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Description</h3>
        <p>${plugin.description || 'No description provided'}</p>
      </div>

      <div class="detail-section">
        <h3>Entry Point</h3>
        <code>${plugin.entryPoint}</code>
      </div>

      ${plugin.homepage ? `
        <div class="detail-section">
          <h3>Links</h3>
          <a href="${plugin.homepage}" target="_blank">Homepage</a>
          ${plugin.repository ? `<a href="${plugin.repository}" target="_blank">Repository</a>` : ''}
          ${plugin.documentation ? `<a href="${plugin.documentation}" target="_blank">Documentation</a>` : ''}
        </div>
      ` : ''}

      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="closeModal('plugin-details-modal')">Close</button>
      </div>
    </div>
  `;
}

async function showMarketplaceItemDetails(marketplaceItemId) {
  try {
    const response = await fetch(`/api/marketplace/items/${marketplaceItemId}`);
    const result = await response.json();

    if (result.success) {
      renderMarketplaceItemDetails(result.data);
      document.getElementById('plugin-details-modal').classList.add('active');
    } else {
      showError(result.error || 'Failed to load marketplace item details');
    }
  } catch (error) {
    console.error('Failed to load marketplace item details:', error);
    showError('Failed to load marketplace item details');
  }
}

function renderMarketplaceItemDetails(item) {
  const title = document.getElementById('plugin-details-title');
  const content = document.getElementById('plugin-details-content');

  title.textContent = item.name;

  content.innerHTML = `
    <div class="plugin-details">
      <div class="detail-section">
        <h3>Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Version:</label>
            <span>${item.version}</span>
          </div>
          <div class="detail-item">
            <label>Category:</label>
            <span>${item.category}</span>
          </div>
          <div class="detail-item">
            <label>Rating:</label>
            <span>${'★'.repeat(Math.round(item.ratingAverage))} (${item.ratingCount} reviews)</span>
          </div>
          <div class="detail-item">
            <label>Installs:</label>
            <span>${item.installCount}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Description</h3>
        <p>${item.description || 'No description provided'}</p>
      </div>

      ${item.changelog ? `
        <div class="detail-section">
          <h3>Changelog</h3>
          <p>${item.changelog}</p>
        </div>
      ` : ''}

      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="closeModal('plugin-details-modal')">Close</button>
        <button class="btn btn-primary" onclick="installFromMarketplace('${item.pluginId}'); closeModal('plugin-details-modal');">
          Install Plugin
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

function editPlugin(pluginId) {
  // TODO: Implement plugin editing
  alert('Plugin editing coming soon');
}