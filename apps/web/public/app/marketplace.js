// Marketplace Frontend Logic

let currentMarketplaceItems = [];
let filteredMarketplaceItems = [];

// ─── Initialize ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadMarketplace();
});

// ─── Load Marketplace ─────────────────────────────────────────────────────────

async function loadMarketplace() {
  try {
    const response = await fetch('/api/workers/marketplace/search', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      currentMarketplaceItems = result.data;
      filteredMarketplaceItems = currentMarketplaceItems;
      renderMarketplace();
    } else {
      showError('Failed to load marketplace');
    }
  } catch (error) {
    console.error('Error loading marketplace:', error);
    showError('Failed to load marketplace');
  }
}

// ─── Render Marketplace ───────────────────────────────────────────────────────

function renderMarketplace() {
  const grid = document.getElementById('marketplaceGrid');
  
  if (filteredMarketplaceItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <h3>No marketplace items found</h3>
        <p>Check back later for new workers</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredMarketplaceItems.map(item => `
    <div class="worker-card">
      <div class="worker-card-header">
        <div class="worker-icon">${getCategoryIcon(item.category)}</div>
        <div class="worker-info">
          <div class="worker-name">${escapeHtml(item.name)}</div>
          <div class="worker-category">${item.category}</div>
        </div>
      </div>
      <div class="worker-description">${escapeHtml(item.shortDescription || item.description)}</div>
      <div class="worker-meta">
        <span class="worker-version">v${item.version}</span>
        <span style="font-size: 12px; color: #718096;">
          ⭐ ${item.ratingAverage.toFixed(1)} (${item.ratingCount})
        </span>
      </div>
      ${item.tags && item.tags.length > 0 ? `
        <div class="worker-tags">
          ${item.tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="form-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
        <button class="btn btn-primary" onclick="installWorker('${item.id}')" style="width: 100%;">
          Install
        </button>
      </div>
    </div>
  `).join('');
}

// ─── Filter Marketplace ───────────────────────────────────────────────────────

function filterMarketplace() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const featured = document.getElementById('featuredFilter').checked;

  filteredMarketplaceItems = currentMarketplaceItems.filter(item => {
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search);
    
    const matchesCategory = !category || item.category === category;
    const matchesFeatured = !featured || item.isFeatured;

    return matchesSearch && matchesCategory && matchesFeatured;
  });

  renderMarketplace();
}

// ─── Install Worker ───────────────────────────────────────────────────────────

async function installWorker(marketplaceItemId) {
  if (!confirm('Are you sure you want to install this worker?')) {
    return;
  }

  try {
    const response = await fetch(`/api/workers/marketplace/${marketplaceItemId}/install`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    
    if (result.success) {
      showSuccess('Worker installed successfully');
    } else {
      showError(result.error || 'Failed to install worker');
    }
  } catch (error) {
    console.error('Error installing worker:', error);
    showError('Failed to install worker');
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getCategoryIcon(category) {
  const icons = {
    ai: '🤖',
    knowledge: '📚',
    search: '🔍',
    document: '📄',
    communication: '💬',
    database: '🗄️',
    analytics: '📊',
    automation: '⚡',
    integration: '🔗',
    development: '💻',
    finance: '💰',
    crm: '👥',
    hr: '👤',
    operations: '⚙️',
    custom: '📦'
  };
  return icons[category] || '📦';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  alert('Error: ' + message);
}

function showSuccess(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #48bb78;
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}