/**
 * Widget: Goals Overview
 * Category: goals | Size: medium (col-span-4)
 * Data from: executive provider (goals key)
 */
(function () {
  'use strict';

  window.DashboardRegistry.registerWidget({
    id: 'goals-overview',
    title: 'Goals Overview',
    description: 'Summary of organisational goals — on-track, at-risk, and behind.',
    icon: '🎯',
    category: window.WIDGET_CATEGORY.GOALS,
    permissions: ['goals.read'],
    size: window.WIDGET_SIZE.MEDIUM,
    priority: 2,
    enabled: true,
    refreshInterval: 600,

    async load() {
      const provider = window.DashboardProviders.get('executive');
      const data = provider ? await provider.load() : {};
      return data.goals ?? {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { onTrack = 0, atRisk = 0, behind = 0, completion = 0 } = data;
      const total = onTrack + atRisk + behind;

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:2rem;font-weight:800;color:var(--dash-text)">${total}</span>
            <span class="dash-tag dash-tag-success">📈 ${completion}% done</span>
          </div>

          <div class="dash-progress-bar">
            <div class="dash-progress-fill success" style="width:${completion}%"></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-top:0.25rem">
            <div style="text-align:center;padding:0.6rem;background:var(--dash-surface-2);border-radius:10px;border:1px solid var(--dash-border)">
              <div style="font-size:1.25rem;font-weight:800;color:var(--dash-success)">${onTrack}</div>
              <div style="font-size:0.7rem;color:var(--dash-text-muted);font-weight:600">On Track</div>
            </div>
            <div style="text-align:center;padding:0.6rem;background:var(--dash-surface-2);border-radius:10px;border:1px solid var(--dash-border)">
              <div style="font-size:1.25rem;font-weight:800;color:var(--dash-warning)">${atRisk}</div>
              <div style="font-size:0.7rem;color:var(--dash-text-muted);font-weight:600">At Risk</div>
            </div>
            <div style="text-align:center;padding:0.6rem;background:var(--dash-surface-2);border-radius:10px;border:1px solid var(--dash-border)">
              <div style="font-size:1.25rem;font-weight:800;color:var(--dash-danger)">${behind}</div>
              <div style="font-size:0.7rem;color:var(--dash-text-muted);font-weight:600">Behind</div>
            </div>
          </div>

          <a href="/goals" class="dash-btn dash-btn-ghost" style="margin-top:0.25rem;font-size:0.78rem;justify-content:center">
            View All Goals →
          </a>
        </div>`;
    },

    settings() { return null; }
  });
})();
