(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'upcoming-milestones',
    title: 'Upcoming Milestones',
    description: 'Milestones due within 30 days.',
    icon: '📍',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.PROJECTS : 'Projects',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 14,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        milestones: [
          { name: 'Design Complete', project: 'API Gateway v2', days: 2 },
          { name: 'Beta Release', project: 'Customer Portal', days: 5 },
          { name: 'Security Audit', project: 'Cost Reduction Initiative', days: 12 },
          { name: 'Hiring Plan Approved', project: 'Engineering Hiring', days: 15 },
          { name: 'Vendor Selection', project: 'Cost Reduction Initiative', days: 28 }
        ]
      };
    },
    render(container, data) {
      let html = '<div style="display:flex; flex-direction:column; gap:0.5rem;">';
      
      data.milestones.forEach(m => {
        let colorClass = 'var(--dash-success)';
        let bgClass = 'rgba(16,185,129,0.1)';
        let dayText = m.days + ' days';
        
        if(m.days <= 3) {
          colorClass = 'var(--dash-danger)';
          bgClass = 'rgba(239,68,68,0.1)';
        } else if (m.days <= 7) {
          colorClass = 'var(--dash-warning)';
          bgClass = 'rgba(245,158,11,0.1)';
        }
        
        html += `
          <div style="display:flex; align-items:flex-start; gap:0.75rem; padding:0.65rem 0.5rem; border-bottom:1px solid var(--dash-border);">
            <div style="width:20px; height:20px; border-radius:50%; border:2px solid \${colorClass}; display:flex; align-items:center; justify-content:center; flex-shrink:0;"></div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:0.8rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${m.name}</div>
              <div style="font-size:0.65rem; color:var(--dash-text-muted); font-weight:600;">\${m.project}</div>
            </div>
            <div style="font-size:0.7rem; font-weight:700; color:\${colorClass}; background:\${bgClass}; padding:0.15rem 0.4rem; border-radius:4px; flex-shrink:0;">
              \${dayText}
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
