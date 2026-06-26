(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'recent-projects',
    title: 'Recent Projects',
    description: 'Recently updated projects.',
    icon: '⚡',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.PROJECTS : 'Projects',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 15,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        projects: [
          { name: 'API Gateway v2', health: 'on_track', progress: 72, icon: '🔌', color: '#6366f1', updated: '10m ago' },
          { name: 'Customer Portal Redesign', health: 'at_risk', progress: 34, icon: '🎨', color: '#10b981', updated: '2h ago' },
          { name: 'Engineering Hiring Pipeline', health: 'on_track', progress: 45, icon: '👥', color: '#3b82f6', updated: '5h ago' }
        ]
      };
    },
    render(container, data) {
      let html = '<div style="display:flex; flex-direction:column; gap:0.5rem;">';
      
      data.projects.forEach(p => {
        let healthLabel = p.health.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        let fillClass = 'success';
        if(p.health === 'at_risk') fillClass = 'warning';
        if(p.health === 'off_track') fillClass = 'danger';
        
        html += `
          <a href="/projects/detail" style="display:flex; gap:0.75rem; padding:0.65rem 0.5rem; border-radius:8px; text-decoration:none; transition:background 0.2s;" onmouseover="this.style.background='var(--dash-surface-2)'" onmouseout="this.style.background='transparent'">
            <div style="width:32px; height:32px; border-radius:8px; background:\${p.color}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0;">\${p.icon}</div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                <span style="font-size:0.8rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${p.name}</span>
                <span style="font-size:0.65rem; color:var(--dash-text-faint);">\${p.updated}</span>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="health-badge health-\${p.health}" style="padding:0.1rem 0.3rem; font-size:0.6rem;">\${healthLabel}</span>
                <div class="dash-progress-bar" style="flex:1; height:4px;">
                  <div class="dash-progress-fill \${fillClass}" style="width:\${p.progress}%;"></div>
                </div>
              </div>
            </div>
          </a>
        `;
      });
      
      html += `</div>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
