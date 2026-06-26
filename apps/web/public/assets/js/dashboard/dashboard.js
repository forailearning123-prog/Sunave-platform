/**
 * Dashboard Bootstrap — Main Entry Point
 *
 * Initialises the dashboard framework:
 * 1. Creates the layout engine for the current user.
 * 2. Renders all registered widgets into the grid.
 * 3. Wires toolbar actions (collapse, pin, hide, refresh, settings).
 * 4. Starts auto-refresh timers per widget's refreshInterval.
 * 5. Handles sidebar toggle and mobile overlay.
 *
 * Widgets self-register by their own script being loaded.
 * This file does NOT import any widget directly.
 */
(function () {
  'use strict';

  // ─── Skeleton Template ────────────────────────────────────────────────────

  function skeletonHTML(lines = 3) {
    const skel = [];
    skel.push('<div class="widget-loader">');
    skel.push(`<div class="skel skel-h2 skel-w-half"></div>`);
    for (let i = 0; i < lines; i++) {
      const w = ['skel-w-full', 'skel-w-3q', 'skel-w-half', 'skel-w-third'][i % 4];
      skel.push(`<div class="skel skel-h1 ${w}"></div>`);
    }
    skel.push('</div>');
    return skel.join('');
  }

  // ─── Render a single widget container ────────────────────────────────────

  function renderWidgetContainer(widget) {
    const el = document.createElement('div');
    el.className = 'widget';
    el.dataset.widgetId = widget.id;
    el.draggable = true;
    el.setAttribute('aria-label', `Widget: ${widget.title}`);

    el.innerHTML = `
      <div class="widget-header">
        <div class="widget-icon">${widget.icon}</div>
        <div class="widget-title">${widget.title}</div>
        <div class="widget-toolbar">
          <button class="widget-tool-btn" data-action="refresh" title="Refresh widget">↺</button>
          <button class="widget-tool-btn" data-action="pin" title="Pin widget">📌</button>
          <button class="widget-tool-btn" data-action="settings" title="Widget settings">⚙</button>
          <button class="widget-tool-btn" data-action="hide" title="Hide widget">✕</button>
        </div>
      </div>
      <div class="widget-body" id="widget-body-${widget.id}">
        ${skeletonHTML()}
      </div>`;

    return el;
  }

  // ─── Load and render a widget's data ─────────────────────────────────────

  async function loadWidget(widget, layoutEngine) {
    const body = document.getElementById(`widget-body-${widget.id}`);
    if (!body) return;

    try {
      const data = await widget.load();
      widget.render(body, data);
    } catch (err) {
      console.error(`[Dashboard] Widget '${widget.id}' failed to load:`, err);
      body.innerHTML = `
        <div class="widget-error">
          <div class="widget-error-icon">⚠️</div>
          <div><strong>Failed to load widget</strong></div>
          <div class="widget-error-msg">${err.message ?? 'Unknown error'}</div>
          <button class="dash-btn dash-btn-ghost" style="margin-top:0.5rem;font-size:0.78rem" onclick="window.DashboardApp.refreshWidget('${widget.id}')">Try Again</button>
        </div>`;
    }
  }

  // ─── Wire toolbar buttons ────────────────────────────────────────────────

  function wireToolbar(el, widget, layoutEngine) {
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'refresh') {
        const body = el.querySelector('.widget-body');
        if (body) body.innerHTML = skeletonHTML();
        loadWidget(widget, layoutEngine);
      }

      if (action === 'pin') {
        layoutEngine.pinWidget(widget.id);
        btn.style.opacity = el.classList.contains('pinned') ? '1' : '';
      }

      if (action === 'hide') {
        layoutEngine.hideWidget(widget.id);
        // Show a restore toast
        showToast(`"${widget.title}" hidden. <a href="#" onclick="window.DashboardApp.showWidget('${widget.id}');return false" style="color:var(--dash-accent)">Undo</a>`);
      }

      if (action === 'settings') {
        const settingsEl = widget.settings ? widget.settings() : null;
        openDrawer(settingsEl, `${widget.icon} ${widget.title} Settings`);
      }
    });
  }

  // ─── Toast notification ──────────────────────────────────────────────────

  function showToast(message) {
    let toastContainer = document.getElementById('dash-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'dash-toast-container';
      toastContainer.style.cssText = `
        position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;
        display:flex;flex-direction:column;gap:0.5rem;max-width:320px`;
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      background:var(--dash-surface);border:1px solid var(--dash-border);
      border-radius:10px;padding:0.75rem 1rem;font-size:0.82rem;
      color:var(--dash-text);box-shadow:var(--dash-shadow);
      animation:fade-in 0.25s ease`;
    toast.innerHTML = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ─── Drawer (for widget settings) ───────────────────────────────────────

  function openDrawer(contentEl, title) {
    let drawer = document.getElementById('dash-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'dash-drawer';
      drawer.className = 'dash-drawer';
      drawer.innerHTML = `
        <div class="dash-drawer-header">
          <div class="dash-drawer-title" id="dash-drawer-title"></div>
          <button class="widget-tool-btn" id="dash-drawer-close" style="width:28px;height:28px">✕</button>
        </div>
        <div class="dash-drawer-body" id="dash-drawer-body"></div>`;
      document.body.appendChild(drawer);
      document.getElementById('dash-drawer-close').addEventListener('click', () => {
        drawer.classList.remove('open');
      });
    }
    document.getElementById('dash-drawer-title').textContent = title;
    const body = document.getElementById('dash-drawer-body');
    body.innerHTML = '';
    if (contentEl) body.appendChild(contentEl);
    else body.innerHTML = '<p style="color:var(--dash-text-muted);font-size:0.875rem">No settings available for this widget.</p>';
    drawer.classList.add('open');
  }

  // ─── Main Initialisation ─────────────────────────────────────────────────

  async function init() {
    const grid = document.getElementById('dashboard-grid');
    const sidebar = document.getElementById('dash-sidebar');
    const sidebarOverlay = document.getElementById('dash-sidebar-overlay');
    const menuToggle = document.getElementById('dash-menu-toggle');

    if (!grid) { console.warn('[Dashboard] No #dashboard-grid found.'); return; }

    // Create layout engine
    const layoutEngine = window.createLayoutEngine({ userId: 'current-user' });
    layoutEngine.attach(grid);

    // Get all enabled widgets from registry
    const widgets = window.DashboardRegistry.getWidgets({ enabledOnly: true });

    // Render widget shells
    for (const widget of widgets) {
      const el = renderWidgetContainer(widget);
      grid.appendChild(el);
      wireToolbar(el, widget, layoutEngine);
    }

    // Apply saved layout (span classes, visibility, pinning)
    layoutEngine.applyInitial();

    // Load widget data concurrently
    await Promise.allSettled(widgets.map(w => loadWidget(w, layoutEngine)));

    // Set up auto-refresh
    const refreshTimers = [];
    for (const widget of widgets) {
      if (widget.refreshInterval > 0) {
        const timer = setInterval(() => loadWidget(widget, layoutEngine), widget.refreshInterval * 1000);
        refreshTimers.push(timer);
      }
    }

    // ── Sidebar toggle (mobile) ─────────────────────────────────────────────
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('open');
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
      });
    }

    // ── Desktop sidebar collapse ────────────────────────────────────────────
    const collapseBtn = document.getElementById('dash-sidebar-collapse');
    if (collapseBtn && sidebar) {
      collapseBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        collapseBtn.textContent = sidebar.classList.contains('collapsed') ? '→' : '←';
      });
    }

    // ── Reset layout button ─────────────────────────────────────────────────
    const resetBtn = document.getElementById('dash-reset-layout');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset dashboard to default layout?')) {
          layoutEngine.restoreDefaults();
          showToast('Dashboard layout reset to defaults.');
        }
      });
    }

    // ── Update live clock ───────────────────────────────────────────────────
    const clock = document.getElementById('dash-clock');
    if (clock) {
      function updateClock() {
        clock.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      updateClock();
      setInterval(updateClock, 10000);
    }

    // ── Expose app API for inline onclick handlers ──────────────────────────
    window.DashboardApp = {
      refreshWidget(id) {
        const widget = window.DashboardRegistry.getWidget(id);
        if (!widget) return;
        const body = document.getElementById(`widget-body-${id}`);
        if (body) body.innerHTML = skeletonHTML();
        loadWidget(widget, layoutEngine);
      },
      showWidget(id) {
        layoutEngine.showWidget(id);
        // Re-load in case it was hidden before data loaded
        const widget = window.DashboardRegistry.getWidget(id);
        if (widget) loadWidget(widget, layoutEngine);
      },
      hideWidget(id) { layoutEngine.hideWidget(id); },
      pinWidget(id)  { layoutEngine.pinWidget(id);  },
      resetLayout()  { layoutEngine.restoreDefaults(); }
    };

    console.log(`[Dashboard] Initialised with ${widgets.length} widgets.`);
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
