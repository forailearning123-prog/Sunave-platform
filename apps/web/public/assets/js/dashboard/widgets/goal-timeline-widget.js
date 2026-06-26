(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'goal-timeline',
    title: 'Goals Timeline',
    description: 'High level view of goal schedules.',
    icon: '📅',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.GOALS : 'Goals',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.LARGE : 'col-span-8',
    priority: 17,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        goals: [
          { name: 'Increase Revenue 30%', startOffset: 0, width: 80, progress: 74, color: 'linear-gradient(90deg,#6366f1,#8b5cf6)', dates: 'Jan - Dec' },
          { name: 'Launch Product V2', startOffset: 10, width: 50, progress: 45, color: 'linear-gradient(90deg,#10b981,#34d399)', dates: 'Feb - Jul' },
          { name: 'Build Engineering Team', startOffset: 20, width: 40, progress: 60, color: 'linear-gradient(90deg,#f59e0b,#fbbf24)', dates: 'Mar - Aug' }
        ]
      };
    },
    render(container, data) {
      let html = `
        <div style="display:flex; flex-direction:column; gap:0.75rem; position:relative; padding-top:1rem;">
          <div style="position:absolute; left:40%; top:0; bottom:0; width:1px; background:rgba(239,68,68,0.5); z-index:1;"></div>
          <div style="position:absolute; left:40%; top:-5px; transform:translateX(-50%); font-size:0.6rem; color:var(--dash-danger); font-weight:700;">TODAY</div>
      `;
      
      data.goals.forEach(g => {
        html += `
          <div style="position:relative; z-index:2; display:flex; align-items:center; gap:0.5rem;">
             <div style="width:140px; font-size:0.75rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0;">\${g.name}</div>
             <div style="flex:1; position:relative; height:24px; background:var(--dash-surface-2); border-radius:6px; overflow:hidden;">
               <div style="position:absolute; left:\${g.startOffset}%; width:\${g.width}%; height:100%; background:\${g.color}; opacity:0.3;"></div>
               <div style="position:absolute; left:\${g.startOffset}%; width:calc(\${g.width}% * (\${g.progress} / 100)); height:100%; background:\${g.color}; display:flex; align-items:center; padding-left:0.5rem; font-size:0.65rem; color:#fff; font-weight:700;">\${g.progress}%</div>
             </div>
             <div style="width:60px; font-size:0.65rem; color:var(--dash-text-faint); text-align:right; flex-shrink:0;">\${g.dates}</div>
          </div>
        `;
      });
      
      html += `</div><a href="/timeline" style="display:block; text-align:center; margin-top:1.25rem; font-size:0.75rem; font-weight:600; color:var(--dash-accent); text-decoration:none;">Full Timeline &rarr;</a>`;
      container.innerHTML = html;
    },
    settings() { return null; }
  });
})();
