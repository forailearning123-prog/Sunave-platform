/**
 * Widget: Executive Summary
 * Category: executive | Size: full-width
 *
 * Renders the top KPI bar: Revenue, Projects, Goals, Workers, AI Usage.
 * Data comes from the 'executive' provider — no direct API calls.
 */
(function () {
  'use strict';

  function fmt(n) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n); }
  function fmtCurrency(n) { return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n); }
  function fmtBytes(b) {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + ' TB';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + ' MB';
    return b + ' B';
  }

  function drawSparkline(canvas, values) {
    if (!canvas || !values || values.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth || 80;
    const H = canvas.height = canvas.offsetHeight || 32;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = W / (values.length - 1);

    const pts = values.map((v, i) => ({ x: i * step, y: H - ((v - min) / range) * (H - 4) - 2 }));

    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(99,102,241,0.4)');
    grad.addColorStop(1, 'rgba(139,92,246,0.8)');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cp = { x: (pts[i-1].x + pts[i].x) / 2, y: (pts[i-1].y + pts[i].y) / 2 };
      ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, cp.x, cp.y);
    }
    ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function kpiCard(kpiColor, icon, label, value, trend, trendUp, sparkValues) {
    const trendClass = trendUp ? 'up' : 'down';
    const trendIcon  = trendUp ? '↑' : '↓';
    return `
      <div class="kpi-card" style="--kpi-color:${kpiColor}">
        <div class="kpi-icon">${icon}</div>
        <div class="kpi-label">${label}</div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:0.5rem">
          <div class="kpi-value">${value}</div>
          ${sparkValues ? `<canvas class="sparkline-wrap" width="80" height="32" data-spark='${JSON.stringify(sparkValues)}'></canvas>` : ''}
        </div>
        <div class="kpi-trend ${trendClass}">${trendIcon} ${trend}</div>
      </div>`;
  }

  window.DashboardRegistry.registerWidget({
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'High-level KPIs: revenue, projects, goals, and team performance.',
    icon: '📊',
    category: window.WIDGET_CATEGORY.EXECUTIVE,
    permissions: [],
    size: window.WIDGET_SIZE.FULL_WIDTH,
    priority: 1,
    enabled: true,
    refreshInterval: 300,

    async load() {
      const provider = window.DashboardProviders.get('executive');
      return provider ? provider.load() : {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { revenue, projects, goals, workers, aiUsage } = data;

      container.innerHTML = `
        <div class="kpi-grid">
          ${kpiCard('#6366f1', '💰', 'Revenue (MTD)',    fmtCurrency(revenue.current),  revenue.trend, revenue.trendUp, revenue.sparkline)}
          ${kpiCard('#10b981', '📁', 'Active Projects',  fmt(projects.active),          projects.trend, projects.trendUp)}
          ${kpiCard('#f59e0b', '🎯', 'Goals On Track',   `${goals.onTrack}/${goals.onTrack + goals.atRisk + goals.behind}`, `${goals.completion}% complete`, true)}
          ${kpiCard('#3b82f6', '⚙️', 'Active Workers',   fmt(workers.active),           `${workers.failed} failed`, workers.failed === 0)}
          ${kpiCard('#8b5cf6', '🤖', 'AI Requests Today', fmt(aiUsage.requests),         aiUsage.trend, aiUsage.trendUp)}
        </div>`;

      // Draw sparklines
      container.querySelectorAll('canvas[data-spark]').forEach(canvas => {
        const vals = JSON.parse(canvas.dataset.spark);
        drawSparkline(canvas, vals);
      });
    },

    settings() { return null; }
  });
})();
