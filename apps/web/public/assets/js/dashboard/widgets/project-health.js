(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'project-health',
    title: 'Project Health',
    description: 'Current health of active projects.',
    icon: '📁',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.PROJECTS : 'Projects',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 12,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        onTrack: 4,
        atRisk: 1,
        offTrack: 0,
        projects: [
          { name: 'API Gateway v2', progress: 72, health: 'on_track' },
          { name: 'Customer Portal Redesign', progress: 34, health: 'at_risk' },
          { name: 'Cost Reduction Initiative', progress: 61, health: 'on_track' },
          { name: 'Engineering Hiring Pipeline', progress: 45, health: 'on_track' },
          { name: 'Security Audit Q2', progress: 10, health: 'on_track' }
        ]
      };
    },
    render(container, data) {
      let html = `
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem; padding:0.5rem; background:var(--dash-surface-2); border-radius:8px; align-items:center;">
          <div style="text-align:center; flex:1;">
             <div style="font-size:1rem; font-weight:700; color:var(--dash-success);">\${data.onTrack}</div>
             <div style="font-size:0.6rem; color:var(--dash-text-muted); text-transform:uppercase;">On Track</div>
          </div>
          <div style="width:1px; height:20px; background:var(--dash-border);"></div>
          <div style="text-align:center; flex:1;">
             <div style="font-size:1rem; font-weight:700; color:var(--dash-warning);">\${data.atRisk}</div>
             <div style="font-size:0.6rem; color:var(--dash-text-muted); text-transform:uppercase;">At Risk</div>
          </div>
          <div style="width:1px; height:20px; background:var(--dash-border);"></div>
          <div style="text-align:center; flex:1;">
             <div style="font-size:1rem; font-weight:700; color:var(--dash-danger);">\${data.offTrack}</div>
             <div style="font-size:0.6rem; color:var(--dash-text-muted); text-transform:uppercase;">Off Track</div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
      `;
      
      data.projects.forEach(p => {
        let healthColor = 'var(--dash-success)';
        if(p.health === 'at_risk') healthColor = 'var(--dash-warning)';
        if(p.health === 'off_track') healthColor = 'var(--dash-danger)';
        
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.5rem; border-radius:6px; transition:background 0.2s;" onmouseover="this.style.background='var(--dash-surface-2)'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <div style="width:8px; height:8px; border-radius:50%; background:\${healthColor}; box-shadow:0 0 6px \${healthColor}40;"></div>
              <span style="font-size:0.82rem; color:var(--dash-text); font-weight:600;">\${p.name}</span>
            </div>
            <span style="font-size:0.75rem; color:var(--dash-text-muted); font-weight:700;">\${p.progress}%</span>
          </div>
        `;
      });
      
      html += `</div><a href="/projects" style="display:block; text-align:center; margin-top:1rem; font-size:0.75rem; font-weight:600; color:var(--dash-accent); text-decoration:none;">View All Projects &rarr;</a>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
