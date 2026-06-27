// AI Intelligence Platform - Frontend Application

const API_BASE = '/api/intelligence';

// Utility functions
const getToken = () => document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];

const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
};

// Memory Explorer
class MemoryExplorer {
  constructor() {
    this.memories = [];
    this.filters = {
      type: '',
      importance: '',
      search: ''
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadMemories();
  }

  bindEvents() {
    document.getElementById('memoryTypeFilter')?.addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.loadMemories();
    });

    document.getElementById('importanceFilter')?.addEventListener('change', (e) => {
      this.filters.importance = e.target.value;
      this.loadMemories();
    });

    document.getElementById('memorySearch')?.addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.debounceLoad();
    });

    document.getElementById('createMemoryBtn')?.addEventListener('click', () => {
      this.showModal();
    });

    document.getElementById('closeMemoryModal')?.addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('cancelMemoryBtn')?.addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('memoryForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createMemory();
    });
  }

  debounceLoad = this.debounce(() => this.loadMemories(), 300);

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  async loadMemories() {
    try {
      const params = new URLSearchParams();
      if (this.filters.type) params.append('memoryType', this.filters.type);
      if (this.filters.importance) params.append('importance', this.filters.importance);
      params.append('limit', '50');

      const result = await apiCall(`/memory?${params}`);
      this.memories = result.data || [];
      this.render();
    } catch (error) {
      console.error('Failed to load memories:', error);
      document.getElementById('memoryGrid').innerHTML = '<p class="text-muted">Failed to load memories</p>';
    }
  }

  render() {
    const grid = document.getElementById('memoryGrid');
    if (!grid) return;

    if (this.memories.length === 0) {
      grid.innerHTML = '<p class="text-muted">No memories found</p>';
      return;
    }

    grid.innerHTML = this.memories.map(memory => `
      <div class="memory-card" data-id="${memory.id}">
        <div class="memory-card-header">
          <h3 class="memory-card-title">${this.escapeHtml(memory.title)}</h3>
          <span class="memory-badge badge-${memory.importance}">${memory.importance}</span>
        </div>
        <p class="memory-card-content">${this.escapeHtml(memory.summary || memory.content)}</p>
        <div class="memory-card-footer">
          <span>${memory.memory_type}</span>
          <div class="memory-tags">
            ${(memory.tags || []).slice(0, 3).map(tag => `<span class="memory-tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  async createMemory() {
    const title = document.getElementById('memoryTitle').value;
    const type = document.getElementById('memoryType').value;
    const content = document.getElementById('memoryContent').value;
    const summary = document.getElementById('memorySummary').value;
    const importance = document.getElementById('memoryImportance').value;
    const confidence = parseFloat(document.getElementById('memoryConfidence').value);
    const tags = document.getElementById('memoryTags').value.split(',').map(t => t.trim()).filter(Boolean);

    try {
      await apiCall('/memory', {
        method: 'POST',
        body: JSON.stringify({
          ownerType: 'user',
          ownerId: 'current-user',
          memoryType: type,
          title,
          summary,
          content,
          importance,
          confidence,
          tags
        })
      });

      this.hideModal();
      document.getElementById('memoryForm').reset();
      this.loadMemories();
    } catch (error) {
      alert('Failed to create memory: ' + error.message);
    }
  }

  showModal() {
    document.getElementById('memoryModal')?.classList.add('active');
  }

  hideModal() {
    document.getElementById('memoryModal')?.classList.remove('active');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Search Panel
class SearchPanel {
  constructor() {
    this.init();
  }

  init() {
    document.getElementById('searchBtn')?.addEventListener('click', () => this.search());
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });
  }

  async search() {
    const query = document.getElementById('searchInput').value;
    const type = document.getElementById('searchType').value;

    if (!query) return;

    try {
      const result = await apiCall('/search', {
        method: 'POST',
        body: JSON.stringify({ q: query, type, limit: 20 })
      });

      this.renderResults(result.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      document.getElementById('searchResults').innerHTML = '<p class="text-muted">Search failed</p>';
    }
  }

  renderResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<p class="text-muted">No results found</p>';
      return;
    }

    container.innerHTML = results.map(result => `
      <div class="search-result-item">
        <div class="search-result-header">
          <h3 class="search-result-title">${this.escapeHtml(result.title || 'Untitled')}</h3>
          <span class="search-result-type">${result.memory_type || result.source_type || 'Unknown'}</span>
        </div>
        <p class="search-result-content">${this.escapeHtml(result.summary || result.content || result.description || '')}</p>
        <div class="search-result-meta">
          <span>Importance: ${result.importance || 'N/A'}</span>
          <span>Created: ${new Date(result.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Context Builder
class ContextBuilder {
  constructor() {
    this.init();
  }

  init() {
    document.getElementById('contextForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.buildContext();
    });
  }

  async buildContext() {
    const query = document.getElementById('contextQuery').value;
    const budget = parseInt(document.getElementById('contextBudget').value);
    const type = document.getElementById('contextType').value;
    const includeMemory = document.getElementById('includeMemory').checked;
    const includeOrgMemory = document.getElementById('includeOrgMemory').checked;
    const includeKnowledge = document.getElementById('includeKnowledge').checked;
    const includeConversation = document.getElementById('includeConversation').checked;
    const maxMemoryItems = parseInt(document.getElementById('maxMemoryItems').value);
    const maxKnowledgeItems = parseInt(document.getElementById('maxKnowledgeItems').value);

    try {
      const result = await apiCall('/context/build', {
        method: 'POST',
        body: JSON.stringify({
          query,
          contextType: type,
          contextWindowBudget: budget,
          includeMemory,
          includeOrgMemory,
          includeKnowledge,
          includeConversation,
          maxMemoryItems,
          maxKnowledgeItems
        })
      });

      this.displayResult(result.data);
    } catch (error) {
      console.error('Failed to build context:', error);
      alert('Failed to build context: ' + error.message);
    }
  }

  displayResult(data) {
    const resultCard = document.getElementById('contextResult');
    if (!resultCard) return;

    resultCard.style.display = 'block';
    document.getElementById('contextTokens').textContent = data.rankingMetadata?.usedTokens || 0;
    document.getElementById('contextBudgetUsed').textContent = data.rankingMetadata?.budgetUtilization?.toFixed(1) + '%' || '0%';
    document.getElementById('contextSources').textContent = data.sources?.length || 0;

    const preview = document.getElementById('contextPreview');
    if (preview && data.sources) {
      preview.innerHTML = data.sources.map(source => `
        <div class="context-source">
          <div class="context-source-header">
            <span class="context-source-type">${source.type}</span>
            <span class="context-source-tokens">${source.tokenEstimate} tokens</span>
          </div>
          <div class="context-source-content">
            ${this.escapeHtml(JSON.stringify(source.data).substring(0, 500))}...
          </div>
        </div>
      `).join('');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Knowledge Base
class KnowledgeBase {
  constructor() {
    this.sources = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSources();
  }

  bindEvents() {
    document.getElementById('sourceTypeFilter')?.addEventListener('change', () => this.loadSources());
    document.getElementById('statusFilter')?.addEventListener('change', () => this.loadSources());
    document.getElementById('addSourceBtn')?.addEventListener('click', () => this.showModal());
    document.getElementById('closeSourceModal')?.addEventListener('click', () => this.hideModal());
    document.getElementById('cancelSourceBtn')?.addEventListener('click', () => this.hideModal());
    document.getElementById('sourceForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addSource();
    });
  }

  async loadSources() {
    try {
      const result = await apiCall('/knowledge/search?limit=50');
      this.sources = result.data || [];
      this.render();
    } catch (error) {
      console.error('Failed to load sources:', error);
      document.getElementById('knowledgeGrid').innerHTML = '<p class="text-muted">Failed to load sources</p>';
    }
  }

  render() {
    const grid = document.getElementById('knowledgeGrid');
    if (!grid) return;

    if (this.sources.length === 0) {
      grid.innerHTML = '<p class="text-muted">No knowledge sources found</p>';
      return;
    }

    grid.innerHTML = this.sources.map(source => `
      <div class="knowledge-card">
        <div class="knowledge-card-header">
          <h3 class="knowledge-card-title">${this.escapeHtml(source.name)}</h3>
          <span class="knowledge-status status-${source.status}">${source.status}</span>
        </div>
        <p class="knowledge-card-description">${this.escapeHtml(source.description)}</p>
        <div class="knowledge-card-footer">
          <span>${source.source_type}</span>
          <span>${source.chunk_count || 0} chunks</span>
        </div>
      </div>
    `).join('');
  }

  async addSource() {
    const name = document.getElementById('sourceName').value;
    const type = document.getElementById('sourceType').value;
    const identifier = document.getElementById('sourceIdentifier').value;
    const description = document.getElementById('sourceDescription').value;

    try {
      await apiCall('/knowledge/index', {
        method: 'POST',
        body: JSON.stringify({
          name,
          sourceType: type,
          sourceIdentifier: identifier,
          description
        })
      });

      this.hideModal();
      document.getElementById('sourceForm').reset();
      this.loadSources();
    } catch (error) {
      alert('Failed to add source: ' + error.message);
    }
  }

  showModal() {
    document.getElementById('sourceModal')?.classList.add('active');
  }

  hideModal() {
    document.getElementById('sourceModal')?.classList.remove('active');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || 'overview';
  
  switch(page) {
    case 'memory':
      new MemoryExplorer();
      break;
    case 'search':
      new SearchPanel();
      break;
    case 'context':
      new ContextBuilder();
      break;
    case 'knowledge':
      new KnowledgeBase();
      break;
    default:
      // Overview page - load stats
      loadOverviewStats();
  }
});

async function loadOverviewStats() {
  try {
    const [memoryStats, knowledgeStats, embeddingStats, contextStats] = await Promise.all([
      apiCall('/memory/stats').catch(() => ({ data: [] })),
      apiCall('/knowledge/stats').catch(() => ({ data: [] })),
      apiCall('/embeddings/stats').catch(() => ({ data: [] })),
      apiCall('/context/stats').catch(() => ({ data: [] }))
    ]);

    const totalMemories = memoryStats.data?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;
    const totalSources = knowledgeStats.data?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;
    const totalEmbeddings = embeddingStats.data?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;
    const totalContexts = contextStats.data?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;

    document.getElementById('totalMemories').textContent = totalMemories;
    document.getElementById('totalSources').textContent = totalSources;
    document.getElementById('totalEmbeddings').textContent = totalEmbeddings;
    document.getElementById('totalContexts').textContent = totalContexts;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}