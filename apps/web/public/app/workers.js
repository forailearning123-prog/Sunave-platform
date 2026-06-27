// Workers Platform Frontend Logic

let currentWorkers = [];
let filteredWorkers = [];

// ─── Initialize ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadWorkers();
});

// ─── Load Workers ─────────────────────────────────────────────────────────────

async function loadWorkers() {
  try {
    const response = await fetch('/api/workers', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      currentWorkers = result.data;
      filteredWorkers = currentWorkers;
      renderWorkers();
    } else {
      showError('Failed to load workers');
    }
  } catch (error) {
    console.error('Error loading workers:', error);
    showError('Failed to load workers');
  }
}

// ─── Render Workers ───────────────────────────────────────────────────────────

function renderWorkers() {
  const grid = document.getElementById('workersGrid');
  
  if (filteredWorkers.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No workers found</h3>
        <p>Get started by creating your first worker</p>
        <button class="btn btn-primary" onclick="createWorker()">Create Worker</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredWorkers.map(worker => `
    <div class="worker-card" onclick="viewWorker('${worker.id}')">
      <div class="worker-card-header">
        <div class="worker-icon">${getWorkerIcon(worker.icon)}</div>
        <div class="worker-info">
          <div class="worker-name">${escapeHtml(worker.displayName)}</div>
          <div class="worker-category">${worker.category}</div>
        </div>
      </div>
      <div class="worker-description">${escapeHtml(worker.description)}</div>
      <div class="worker-meta">
        <span class="worker-status status-${worker.status}">
          ${getStatusIcon(worker.status)}
          ${worker.status}
        </span>
        <span class="worker-version">v${worker.version}</span>
      </div>
      ${worker.tags && worker.tags.length > 0 ? `
        <div class="worker-tags">
          ${worker.tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// ─── Filter Workers ───────────────────────────────────────────────────────────

function filterWorkers() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;

  filteredWorkers = currentWorkers.filter(worker => {
    const matchesSearch = !search || 
      worker.name.toLowerCase().includes(search) ||
      worker.displayName.toLowerCase().includes(search) ||
      worker.description.toLowerCase().includes(search);
    
    const matchesCategory = !category || worker.category === category;
    const matchesStatus = !status || worker.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  renderWorkers();
}

// ─── Create Worker ────────────────────────────────────────────────────────────

async function createWorker() {
  const formHtml = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create New Worker</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <form id="createWorkerForm" onsubmit="handleCreateWorker(event)">
        <div class="form-group">
          <label for="name">Worker Name *</label>
          <input type="text" id="name" name="name" required placeholder="e.g., email-processor">
        </div>
        <div class="form-group">
          <label for="displayName">Display Name *</label>
          <input type="text" id="displayName" name="displayName" required placeholder="e.g., Email Processor">
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" placeholder="Describe what this worker does..."></textarea>
        </div>
        <div class="form-group">
          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="ai">AI</option>
            <option value="knowledge">Knowledge</option>
            <option value="search">Search</option>
            <option value="document">Document</option>
            <option value="communication">Communication</option>
            <option value="database">Database</option>
            <option value="analytics">Analytics</option>
            <option value="automation">Automation</option>
            <option value="integration">Integration</option>
            <option value="development">Development</option>
            <option value="finance">Finance</option>
            <option value="crm">CRM</option>
            <option value="hr">HR</option>
            <option value="operations">Operations</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label for="icon">Icon</label>
          <select id="icon" name="icon">
            <option value="box">Box</option>
            <option value="cpu">CPU</option>
            <option value="database">Database</option>
            <option value="mail">Mail</option>
            <option value="file-text">File</option>
            <option value="search">Search</option>
            <option value="code">Code</option>
            <option value="settings">Settings</option>
          </select>
        </div>
        <div class="form-group">
          <label for="visibility">Visibility</label>
          <select id="visibility" name="visibility">
            <option value="private">Private</option>
            <option value="organization">Organization</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div class="form-group">
          <label for="tags">Tags (comma-separated)</label>
          <input type="text" id="tags" name="tags" placeholder="e.g., email, automation, processing">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Worker</button>
        </div>
      </form>
    </div>
  `;

  showModal(formHtml);
}

async function handleCreateWorker(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    displayName: formData.get('displayName'),
    description: formData.get('description'),
    category: formData.get('category'),
    icon: formData.get('icon'),
    visibility: formData.get('visibility'),
    tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
    version: '1.0.0',
    status: 'draft',
    supportedExecutionModes: ['manual']
  };

  try {
    const response = await fetch('/api/workers', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (result.success) {
      closeModal();
      loadWorkers();
      showSuccess('Worker created successfully');
    } else {
      showError(result.error || 'Failed to create worker');
    }
  } catch (error) {
    console.error('Error creating worker:', error);
    showError('Failed to create worker');
  }
}

// ─── View Worker ──────────────────────────────────────────────────────────────

async function viewWorker(workerId) {
  try {
    const response = await fetch(`/api/workers/${workerId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      const worker = result.data;
      showWorkerDetail(worker);
    } else {
      showError('Failed to load worker details');
    }
  } catch (error) {
    console.error('Error loading worker:', error);
    showError('Failed to load worker details');
  }
}

function showWorkerDetail(worker) {
  const formHtml = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h2>${escapeHtml(worker.displayName)}</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div style="padding: 20px 0;">
        <div style="margin-bottom: 20px;">
          <strong>Category:</strong> ${worker.category}
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Status:</strong> 
          <span class="worker-status status-${worker.status}">${worker.status}</span>
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Version:</strong> v${worker.version}
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Description:</strong>
          <p style="margin-top: 8px; color: #4a5568;">${escapeHtml(worker.description)}</p>
        </div>
        ${worker.capabilities && worker.capabilities.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <strong>Capabilities:</strong>
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
              ${worker.capabilities.map(cap => `<span class="tag">${escapeHtml(cap)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${worker.tags && worker.tags.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <strong>Tags:</strong>
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
              ${worker.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div style="margin-bottom: 20px;">
          <strong>Execution Modes:</strong>
          <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
            ${(worker.supportedExecutionModes || []).map(mode => `<span class="tag">${mode}</span>`).join('')}
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Close</button>
          <button class="btn btn-primary" onclick="executeWorker('${worker.id}')">Execute Worker</button>
        </div>
      </div>
    </div>
  `;

  showModal(formHtml);
}

// ─── Execute Worker ───────────────────────────────────────────────────────────

async function executeWorker(workerId) {
  const formHtml = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Execute Worker</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <form id="executeWorkerForm" onsubmit="handleExecuteWorker(event, '${workerId}')">
        <div class="form-group">
          <label for="executionMode">Execution Mode *</label>
          <select id="executionMode" name="executionMode" required>
            <option value="manual">Manual</option>
            <option value="api">API</option>
            <option value="workflow">Workflow</option>
            <option value="agent">Agent</option>
            <option value="webhook">Webhook</option>
            <option value="event">Event</option>
          </select>
        </div>
        <div class="form-group">
          <label for="inputs">Inputs (JSON)</label>
          <textarea id="inputs" name="inputs" placeholder='{"key": "value"}'></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Execute</button>
        </div>
      </form>
    </div>
  `;

  showModal(formHtml);
}

async function handleExecuteWorker(event, workerId) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  let inputs = {};
  const inputsText = formData.get('inputs');
  if (inputsText) {
    try {
      inputs = JSON.parse(inputsText);
    } catch (e) {
      showError('Invalid JSON for inputs');
      return;
    }
  }

  const data = {
    executionMode: formData.get('executionMode'),
    inputs
  };

  try {
    const response = await fetch(`/api/workers/${workerId}/execute`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showSuccess('Worker execution started');
    } else {
      showError(result.error || 'Failed to execute worker');
    }
  } catch (error) {
    console.error('Error executing worker:', error);
    showError('Failed to execute worker');
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getWorkerIcon(icon) {
  const icons = {
    box: '📦',
    cpu: '⚙️',
    database: '🗄️',
    mail: '📧',
    'file-text': '📄',
    search: '🔍',
    code: '💻',
    settings: '⚙️'
  };
  return icons[icon] || '📦';
}

function getStatusIcon(status) {
  const icons = {
    draft: '📝',
    testing: '🧪',
    published: '✅',
    deprecated: '⚠️',
    archived: '📦'
  };
  return icons[status] || '●';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showModal(content) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'modal';
  modal.innerHTML = content;
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.remove();
  }
}

function showError(message) {
  alert('Error: ' + message);
}

function showSuccess(message) {
  // Simple success notification
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

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modal');
  if (modal && e.target === modal) {
    closeModal();
  }
});