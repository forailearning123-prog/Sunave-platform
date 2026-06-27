// Workflows Platform Frontend Logic

let currentWorkflows = [];
let filteredWorkflows = [];

// ─── Initialize ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadWorkflows();
});

// ─── Load Workflows ───────────────────────────────────────────────────────────

async function loadWorkflows() {
  try {
    const response = await fetch('/api/workflows', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      currentWorkflows = result.data;
      filteredWorkflows = currentWorkflows;
      renderWorkflows();
    } else {
      showError('Failed to load workflows');
    }
  } catch (error) {
    console.error('Error loading workflows:', error);
    showError('Failed to load workflows');
  }
}

// ─── Render Workflows ─────────────────────────────────────────────────────────

function renderWorkflows() {
  const grid = document.getElementById('workflowsGrid');
  
  if (filteredWorkflows.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <h3>No workflows found</h3>
        <p>Get started by creating your first workflow</p>
        <button class="btn btn-primary" onclick="createWorkflow()">Create Workflow</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredWorkflows.map(workflow => `
    <div class="worker-card" onclick="viewWorkflow('${workflow.id}')">
      <div class="worker-card-header">
        <div class="worker-icon">⚡</div>
        <div class="worker-info">
          <div class="worker-name">${escapeHtml(workflow.name)}</div>
          <div class="worker-category">${workflow.category}</div>
        </div>
      </div>
      <div class="worker-description">${escapeHtml(workflow.description)}</div>
      <div class="worker-meta">
        <span class="worker-status status-${workflow.status}">
          ${getStatusIcon(workflow.status)}
          ${workflow.status}
        </span>
        <span class="worker-version">v${workflow.version}</span>
      </div>
      ${workflow.steps && workflow.steps.length > 0 ? `
        <div class="worker-tags">
          ${workflow.steps.slice(0, 3).map(step => `<span class="tag">${escapeHtml(step.name)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// ─── Filter Workflows ─────────────────────────────────────────────────────────

function filterWorkflows() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;

  filteredWorkflows = currentWorkflows.filter(workflow => {
    const matchesSearch = !search || 
      workflow.name.toLowerCase().includes(search) ||
      workflow.description.toLowerCase().includes(search);
    
    const matchesCategory = !category || workflow.category === category;
    const matchesStatus = !status || workflow.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  renderWorkflows();
}

// ─── Create Workflow ──────────────────────────────────────────────────────────

async function createWorkflow() {
  const formHtml = `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h2>Create New Workflow</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <form id="createWorkflowForm" onsubmit="handleCreateWorkflow(event)">
        <div class="form-group">
          <label for="name">Workflow Name *</label>
          <input type="text" id="name" name="name" required placeholder="e.g., Document Processing Pipeline">
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" placeholder="Describe what this workflow does..."></textarea>
        </div>
        <div class="form-group">
          <label for="category">Category *</label>
          <select id="category" name="category" required>
            <option value="ai">AI</option>
            <option value="knowledge">Knowledge</option>
            <option value="document">Document</option>
            <option value="communication">Communication</option>
            <option value="database">Database</option>
            <option value="analytics">Analytics</option>
            <option value="automation">Automation</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label for="version">Version</label>
          <input type="text" id="version" name="version" value="1.0.0">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Workflow</button>
        </div>
      </form>
    </div>
  `;

  showModal(formHtml);
}

async function handleCreateWorkflow(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    version: formData.get('version'),
    status: 'draft',
    steps: [],
    connections: [],
    variables: {},
    inputs: [],
    outputs: [],
    triggers: []
  };

  try {
    const response = await fetch('/api/workflows', {
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
      loadWorkflows();
      showSuccess('Workflow created successfully');
    } else {
      showError(result.error || 'Failed to create workflow');
    }
  } catch (error) {
    console.error('Error creating workflow:', error);
    showError('Failed to create workflow');
  }
}

// ─── View Workflow ────────────────────────────────────────────────────────────

async function viewWorkflow(workflowId) {
  try {
    const response = await fetch(`/api/workflows/${workflowId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      const workflow = result.data;
      showWorkflowDetail(workflow);
    } else {
      showError('Failed to load workflow details');
    }
  } catch (error) {
    console.error('Error loading workflow:', error);
    showError('Failed to load workflow details');
  }
}

function showWorkflowDetail(workflow) {
  const formHtml = `
    <div class="modal-content" style="max-width: 900px;">
      <div class="modal-header">
        <h2>${escapeHtml(workflow.name)}</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div style="padding: 20px 0;">
        <div style="margin-bottom: 20px;">
          <strong>Category:</strong> ${workflow.category}
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Status:</strong> 
          <span class="worker-status status-${workflow.status}">${workflow.status}</span>
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Version:</strong> v${workflow.version}
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Description:</strong>
          <p style="margin-top: 8px; color: #4a5568;">${escapeHtml(workflow.description)}</p>
        </div>
        ${workflow.steps && workflow.steps.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <strong>Steps (${workflow.steps.length}):</strong>
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
              ${workflow.steps.map((step, index) => `
                <div style="padding: 10px; background: #f7fafc; border-radius: 4px; border-left: 3px solid #3182ce;">
                  <strong>${index + 1}. ${escapeHtml(step.name)}</strong>
                  <span style="margin-left: 10px; color: #718096; font-size: 12px;">(${step.stepType})</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div style="margin-bottom: 20px;">
          <strong>Connections:</strong> ${workflow.connections ? workflow.connections.length : 0}
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Close</button>
          <button class="btn btn-primary" onclick="runWorkflow('${workflow.id}')">Run Workflow</button>
        </div>
      </div>
    </div>
  `;

  showModal(formHtml);
}

// ─── Run Workflow ─────────────────────────────────────────────────────────────

async function runWorkflow(workflowId) {
  if (!confirm('Are you sure you want to run this workflow?')) {
    return;
  }

  try {
    const response = await fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        triggerType: 'manual',
        inputs: {}
      })
    });

    const result = await response.json();
    
    if (result.success) {
      closeModal();
      showSuccess('Workflow execution started');
    } else {
      showError(result.error || 'Failed to run workflow');
    }
  } catch (error) {
    console.error('Error running workflow:', error);
    showError('Failed to run workflow');
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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