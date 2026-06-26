(function() {
  'use strict';
  if (!window.DashboardRegistry) return;

  window.DashboardRegistry.registerWidget({
    id: 'budget-summary',
    title: 'Budget Summary',
    description: 'Goal budget allocation and usage.',
    icon: '💰',
    category: window.WIDGET_CATEGORY ? window.WIDGET_CATEGORY.EXECUTIVE : 'Executive',
    size: window.WIDGET_SIZE ? window.WIDGET_SIZE.MEDIUM : 'col-span-4',
    priority: 18,
    enabled: true,
    refreshInterval: 300,
    async load() {
      return {
        totalBudget: 1250000,
        totalSpent: 450000,
        goals: [
          { name: 'Increase Annual Revenue 30%', spent: 150000, allocated: 500000 },
          { name: 'Launch Product V2', spent: 250000, allocated: 400000 },
          { name: 'Improve Customer Retention', spent: 50000, allocated: 350000 }
        ]
      };
    },
    render(container, data) {
      const formatCurrency = (val) => '$' + (val / 1000).toFixed(0) + 'k';
      const totalPct = Math.round((data.totalSpent / data.totalBudget) * 100);
      
      let html = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.25rem;">
          <div>
            <div style="font-size:0.7rem; font-weight:700; color:var(--dash-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.15rem;">Total Spend</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--dash-text); line-height:1;">\${formatCurrency(data.totalSpent)} <span style="font-size:0.8rem; color:var(--dash-text-faint); font-weight:600;">/ \${formatCurrency(data.totalBudget)}</span></div>
          </div>
          <div class="dash-tag dash-tag-info">\${totalPct}% Used</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
      `;
      
      data.goals.forEach(g => {
        let pct = Math.round((g.spent / g.allocated) * 100);
        let fillClass = 'success';
        if(pct > 75) fillClass = 'warning';
        if(pct > 90) fillClass = 'danger';
        
        html += `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
              <span style="font-size:0.75rem; font-weight:600; color:var(--dash-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${g.name}</span>
              <span style="font-size:0.7rem; color:var(--dash-text-muted); font-weight:600; flex-shrink:0;">\${formatCurrency(g.spent)} / \${formatCurrency(g.allocated)}</span>
            </div>
            <div class="dash-progress-bar">
              <div class="dash-progress-fill \${fillClass}" style="width:\${pct}%;"></div>
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
