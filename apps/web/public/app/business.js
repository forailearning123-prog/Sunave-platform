// Business Operating Platform Frontend
// Epic 6 - Shared foundation for all business modules

const API_BASE = '/api/business';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupNavigation();
  setupEventListeners();
});

async function initializeApp() {
  await loadDashboardStats();
  await loadNotificationBadge();
}

// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });

  // Show active page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  const activePage = document.getElementById(`page-${page}`);
  if (activePage) {
    activePage.classList.add('active');
  }

  // Load page-specific data
  switch (page) {
    case 'dashboard':
      loadDashboardStats();
      break;
    case 'objects':
      loadObjects();
      break;
    case 'search':
      break;
    case 'activity':
      loadActivityTimeline();
      break;
    case 'tasks':
      loadTasks();
      break;
    case 'approvals':
      loadApprovals();
      break;
    case 'notifications':
      loadNotifications();
      break;
    case 'favorites':
      loadFavorites();
      break;
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Object type filter
  const objectTypeFilter = document.getElementById('filter-object-type');
  if (objectTypeFilter) {
    objectTypeFilter.addEventListener('change', loadObjects);
  }

  // Search on Enter key
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
}

// ============================================
// API HELPERS
// ============================================

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API call failed');
  }

  return data;
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboardStats() {
  try {
    const data = await apiCall('/dashboard');
    const stats = data.data;

    // Update stat cards
    document.getElementById('stat-total-objects').textContent = stats.recentObjects?.length || 0;
    document.getElementById('stat-pending-approvals').textContent = stats.pendingApprovals?.length || 0;
    document.getElementById('stat-unread-notifications').textContent = stats.unreadNotifications || 0;
    document.getElementById('stat-open-tasks').textContent = stats.taskStats?.open_tasks || 0;

    // Load recent activity
    loadRecentActivity(stats.recentActivity);

    // Load pending approvals
    loadPendingApprovals(stats.pendingApprovals);

    // Load recent objects
    loadRecentObjects(stats.recentObjects);
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
  }
}

function loadRecentActivity(activities) {
  const container = document.getElementById('recent-activity');
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="empty-state">No recent activity</p>';
    return;
  }

  container.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">${getActivityIcon(activity.activityType)}</div>
      <div class="activity-content">
        <div class="activity-description">${activity.description}</div>
        <div class="activity-time">${formatTimeAgo(activity.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

function loadPendingApprovals(approvals) {
  const container = document.getElementById('pending-approvals');
  if (!container) return;

  if (!approvals || approvals.length === 0) {
    container.innerHTML = '<p class="empty-state">No pending approvals</p>';
    return;
  }

  container.innerHTML = approvals.map(approval => `
    <div class="approval-card status-${approval.status}">
      <div class="approval-header">
        <div class="approval-title">${approval.title}</div>
        <span class="approval-status status-${approval.status}">${approval.status}</span>
      </div>
      <div class="approval-description">${approval.description || ''}</div>
      <div class="approval-meta">
        <span>Requested by: ${approval.requesterName}</span>
        <span>${formatTimeAgo(approval.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

function loadRecentObjects(objects) {
  const container = document.getElementById('recent-objects');
  if (!container) return;

  if (!objects || objects.data?.length === 0) {
    container.innerHTML = '<p class="empty-state">No recent objects</p>';
    return;
  }

  const objectsList = objects.data || objects;
  container.innerHTML = objectsList.slice(0, 6).map(obj => `
    <div class="object-card" onclick="viewObject('${obj.id}')">
      <div class="object-header">
        <span class="object-type">${obj.objectType}</span>
        <span class="object-status status-${obj.status}">${obj.status}</span>
      </div>
      <div class="object-name">${obj.name}</div>
      <div class="object-description">${obj.description || ''}</div>
      <div class="object-meta">
        <span>${formatTimeAgo(obj.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

// ============================================
// OBJECTS
// ============================================

async function loadObjects() {
  try {
    const objectType = document.getElementById('filter-object-type')?.value || '';
    const params = new URLSearchParams();
    if (objectType) params.append('objectType', objectType);
    params.append('limit', '50');

    const data = await apiCall(`/objects?${params.toString()}`);
    const objects = data.data;

    const container = document.getElementById('objects-list');
    if (!container) return;

    if (objects.length === 0) {
      container.innerHTML = '<p class="empty-state">No objects found. Create your first object!</p>';
      return;
    }

    container.innerHTML = objects.map(obj => `
      <div class="object-card" onclick="viewObject('${obj.id}')">
        <div class="object-header">
          <span class="object-type">${obj.objectType}</span>
          <span class="object-status status-${obj.status}">${obj.status}</span>
        </div>
        <div class="object-name">${obj.name}</div>
        <div class="object-description">${obj.description || ''}</div>
        <div class="object-meta">
          <span>${formatTimeAgo(obj.createdAt)}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load objects:', error);
  }
}

async function createObject(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const data = {
    objectType: formData.get('objectType'),
    name: formData.get('name'),
    description: formData.get('description'),
    status: formData.get('status'),
  };

  try {
    await apiCall('/objects', 'POST', data);
    closeModal('create-object-modal');
    form.reset();
    loadObjects();
    loadDashboardStats();
  } catch (error) {
    alert('Failed to create object: ' + error.message);
  }
}

function viewObject(id) {
  window.location.href = `/business/objects/${id}`;
}

// ============================================
// SEARCH
// ============================================

async function performSearch() {
  const query = document.getElementById('global-search-input')?.value;
  if (!query) return;

  try {
    const data = await apiCall('/search', 'POST', { query });
    const results = data.data;

    const container = document.getElementById('search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<p class="empty-state">No results found</p>';
      return;
    }

    container.innerHTML = results.map(result => `
      <div class="search-result-item" onclick="viewObject('${result.id}')">
        <div class="search-result-header">
          <div class="search-result-title">${result.name}</div>
          <span class="search-result-type">${result.objectType}</span>
        </div>
        <div class="search-result-description">${result.description || ''}</div>
        <div class="search-result-meta">
          Status: ${result.status} • ${formatTimeAgo(result.createdAt)}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// ============================================
// ACTIVITY TIMELINE
// ============================================

async function loadActivityTimeline() {
  try {
    const data = await apiCall('/activity?limit=50');
    const activities = data.data;

    const container = document.getElementById('activity-timeline');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = '<p class="empty-state">No activity yet</p>';
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="timeline-item">
        <div class="timeline-content">
          <div class="timeline-header">
            <div class="timeline-title">${activity.description}</div>
            <div class="timeline-time">${formatTimeAgo(activity.createdAt)}</div>
          </div>
          <div class="timeline-actor">By: ${activity.actorType}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load activity:', error);
  }
}

// ============================================
// TASKS
// ============================================

async function loadTasks() {
  try {
    // For demo, load tasks for the first available object
    const objectsData = await apiCall('/objects?limit=1');
    if (objectsData.data.length === 0) {
      document.getElementById('tasks-board').innerHTML = '<p class="empty-state">No tasks yet</p>';
      return;
    }

    const objectId = objectsData.data[0].id;
    const data = await apiCall(`/objects/${objectId}/tasks`);
    const tasks = data.data;

    const container = document.getElementById('tasks-board');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<p class="empty-state">No tasks yet</p>';
      return;
    }

    container.innerHTML = tasks.map(task => `
      <div class="task-card priority-${task.priority}">
        <div class="task-header">
          <div class="task-title">${task.title}</div>
          <span class="task-priority priority-${task.priority}">${task.priority}</span>
        </div>
        <div class="task-description">${task.description || ''}</div>
        <div class="task-meta">
          <div class="task-assignee">
            ${task.assigneeName ? `👤 ${task.assigneeName}` : '👤 Unassigned'}
          </div>
          <div class="task-due-date ${task.dueDate && new Date(task.dueDate) < new Date() ? 'overdue' : ''}">
            ${task.dueDate ? `📅 ${formatDate(task.dueDate)}` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load tasks:', error);
  }
}

function showCreateTaskModal() {
  alert('Create task modal - to be implemented');
}

// ============================================
// APPROVALS
// ============================================

async function loadApprovals() {
  try {
    const data = await apiCall('/activity'); // Placeholder
    const container = document.getElementById('approvals-container');
    if (!container) return;

    container.innerHTML = '<p class="empty-state">Approvals feature coming soon</p>';
  } catch (error) {
    console.error('Failed to load approvals:', error);
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

async function loadNotifications() {
  try {
    const data = await apiCall('/notifications?limit=50');
    const notifications = data.data;

    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (notifications.length === 0) {
      container.innerHTML = '<p class="empty-state">No notifications</p>';
      return;
    }

    container.innerHTML = notifications.map(notification => `
      <div class="notification-item ${notification.isRead ? '' : 'unread'}">
        <div class="notification-icon">${getNotificationIcon(notification.notificationType)}</div>
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message || ''}</div>
          <div class="notification-time">${formatTimeAgo(notification.createdAt)}</div>
        </div>
        <span class="notification-priority priority-${notification.priority}">${notification.priority}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

async function loadNotificationBadge() {
  try {
    const data = await apiCall('/notifications/unread-count');
    const count = data.data.count;

    const badge = document.getElementById('notification-badge');
    if (badge && count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    }
  } catch (error) {
    console.error('Failed to load notification badge:', error);
  }
}

async function markAllNotificationsRead() {
  try {
    await apiCall('/notifications/read-all', 'PUT');
    loadNotifications();
    loadNotificationBadge();
  } catch (error) {
    alert('Failed to mark notifications as read: ' + error.message);
  }
}

// ============================================
// FAVORITES
// ============================================

async function loadFavorites() {
  try {
    const data = await apiCall('/favorites');
    const favorites = data.data;

    const container = document.getElementById('favorites-grid');
    if (!container) return;

    if (favorites.length === 0) {
      container.innerHTML = '<p class="empty-state">No favorites yet</p>';
      return;
    }

    container.innerHTML = favorites.map(favorite => `
      <div class="favorite-card" onclick="viewObject('${favorite.objectId}')">
        <div class="favorite-header">
          <div class="favorite-icon">⭐</div>
        </div>
        <div class="favorite-name">${favorite.objectName}</div>
        <div class="favorite-type">${favorite.objectType}</div>
        <div class="favorite-meta">
          Added ${formatTimeAgo(favorite.createdAt)}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load favorites:', error);
  }
}

// ============================================
// MODALS
// ============================================

function showCreateObjectModal() {
  document.getElementById('create-object-modal').style.display = 'flex';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function getActivityIcon(activityType) {
  const icons = {
    created: '✨',
    updated: '✏️',
    deleted: '🗑️',
    commented: '💬',
    assigned: '👤',
    mentioned: '@',
    approved: '✅',
    rejected: '❌',
    status_changed: '🔄',
    task_created: '✓',
    task_updated: '✏️',
    approval_requested: '⏳',
  };
  return icons[activityType] || '📌';
}

function getNotificationIcon(notificationType) {
  const icons = {
    mention: '@',
    task_assigned: '✓',
    approval_requested: '⏳',
    approval_decided: '✅',
  };
  return icons[notificationType] || '🔔';
}

// Close modal on outside click
window.onclick = function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};