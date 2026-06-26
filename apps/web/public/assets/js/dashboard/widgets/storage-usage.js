/**
 * Widget: Storage Usage
 * Category: system | Size: small (col-span-4)
 * Data from: executive provider (storage key)
 */
(function () {
  'use strict';

  function fmtBytes(b) {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + ' TB';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + ' MB';
    return b + ' B';
  }

  window.DashboardRegistry.registerWidget({
    id: 'storage-usage',
    title: 'Storage Usage',
    description: 'Organisation storage consumption and quota status.',
    icon: '💾',
    category: window.WIDGET_CATEGORY.SYSTEM,
    permissions: [],
    size: window.WIDGET_SIZE.SMALL,
    priority: 9,
    enabled: true,
    refreshInterval: 600,

    async load() {
      const provider = window.DashboardProviders.get('executive');
      const data = provider ? await provider.load() : {};
      return data.storage ?? {};
    },

    render(container, data) {
      if (!data) { container.innerHTML = '<p style="padding:1rem;color:var(--dash-text-muted)">No data.</p>'; return; }
      const { usedBytes = 0, totalBytes = 1, percent = 0 } = data;
      const fillClass = percent > 80 ? 'danger' : percent > 60 ? 'warning' : 'success';

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.6rem">
          <div style="display:flex;align-items:baseline;gap:0.4rem">
            <span style="font-size:1.5rem;font-weight:800;color:var(--dash-text)">${percent}%</span>
            <span style="font-size:0.78rem;color:var(--dash-text-muted)">used</span>
          </div>

          <div class="dash-progress-bar">
            <div class="dash-progress-fill ${fillClass}" style="width:${percent}%"></div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--dash-text-muted)">
            <span>${fmtBytes(usedBytes)} used</span>
            <span>${fmtBytes(totalBytes)} total</span>
          </div>

          <div class="dash-tag dash-tag-${fillClass === 'danger' ? 'danger' : fillClass === 'warning' ? 'warning' : 'success'}" style="width:fit-content">
            ${percent < 60 ? '✓ Plenty of space' : percent < 80 ? '⚠ Moderate usage' : '🔴 High usage'}
          </div>
        </div>`;
    },

    settings() { return null; }
  });
})();
