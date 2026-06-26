(function() {
  'use strict';

  window.WIDGET_CATEGORY = {
    GOALS: 'Goals',
    PROJECTS: 'Projects',
    EXECUTIVE: 'Executive',
    SYSTEM: 'System'
  };

  window.WIDGET_SIZE = {
    SMALL: 'col-span-3',
    MEDIUM: 'col-span-4',
    LARGE: 'col-span-8',
    FULL_WIDTH: 'col-span-12'
  };

  class DashboardFramework {
    constructor() {
      this.widgets = new Map();
      this.activeWidgets = [];
    }

    registerWidget(config) {
      this.widgets.set(config.id, config);
    }

    async initialize() {
      // By default, activate all registered widgets sorted by priority
      const sortedWidgets = Array.from(this.widgets.values())
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));
        
      this.activeWidgets = sortedWidgets.map(w => w.id);
      
      this.renderDashboard();
      this.renderCatalog();
    }

    async renderDashboard() {
      const container = document.getElementById('dashboard-widget-container');
      if (!container) return;
      container.innerHTML = '';
      
      for (const id of this.activeWidgets) {
        const widget = this.widgets.get(id);
        if (!widget) continue;
        
        const el = document.createElement('div');
        el.className = `widget \${widget.size}`;
        el.id = `widget-\${id}`;
        
        const header = document.createElement('div');
        header.className = 'widget-header';
        header.innerHTML = `
          <div class="widget-icon">\${widget.icon}</div>
          <div class="widget-title">\${widget.title}</div>
          <div class="widget-toolbar">
            <button class="widget-tool-btn" onclick="DashboardRegistry.removeWidget('\${id}')">✕</button>
          </div>
        `;
        
        const body = document.createElement('div');
        body.className = 'widget-body';
        body.id = `widget-body-\${id}`;
        
        // loading state
        body.innerHTML = `
          <div class="widget-loader">
            <div class="skel skel-h2 skel-w-half"></div>
            <div class="skel skel-h1 skel-w-full"></div>
            <div class="skel skel-h1 skel-w-full"></div>
          </div>
        `;
        
        el.appendChild(header);
        el.appendChild(body);
        container.appendChild(el);
        
        try {
          const data = await widget.load();
          widget.render(body, data);
        } catch (err) {
          body.innerHTML = `
            <div class="widget-error">
               <div class="widget-error-icon">⚠️</div>
               <div>Failed to load widget</div>
               <div class="widget-error-msg">\${err.message}</div>
            </div>
          `;
        }
      }
    }

    renderCatalog() {
      const container = document.getElementById('widget-catalog-container');
      if (!container) return;
      container.innerHTML = '';
      
      this.widgets.forEach(widget => {
        if (this.activeWidgets.includes(widget.id)) return; // Already active
        
        const el = document.createElement('div');
        el.className = 'widget-card';
        el.style.marginBottom = '1rem';
        el.innerHTML = `
          <div class="widget-card-icon">\${widget.icon}</div>
          <div class="widget-card-body">
             <div class="widget-card-title">\${widget.title}</div>
             <div class="widget-card-desc">\${widget.description}</div>
             <button class="dash-btn dash-btn-sm dash-btn-secondary" onclick="DashboardRegistry.addWidget('\${widget.id}')">Add Widget</button>
          </div>
        `;
        container.appendChild(el);
      });
    }

    addWidget(id) {
      if (!this.activeWidgets.includes(id)) {
        this.activeWidgets.push(id);
        this.renderDashboard();
        this.renderCatalog();
      }
    }

    removeWidget(id) {
      this.activeWidgets = this.activeWidgets.filter(wId => wId !== id);
      this.renderDashboard();
      this.renderCatalog();
    }
  }

  window.DashboardRegistry = new DashboardFramework();
})();
