/**
 * Dashboard Layout Engine — Client Side
 *
 * Manages widget positions on the dashboard grid.
 * Persists layouts to localStorage (per user, keyed by userId).
 *
 * Implements:
 *   moveWidget(id, position)
 *   resizeWidget(id, size)
 *   hideWidget(id)
 *   pinWidget(id)
 *   restoreDefaults()
 *
 * Also drives the HTML5 drag-and-drop interaction.
 */

(function (global) {
  'use strict';

  // ─── Default Layout ────────────────────────────────────────────────────────
  // colSpan values are out of 12. Sizes map to display class names.

  const DEFAULT_LAYOUT = [
    { widgetId: 'executive-summary', colSpan: 12, hidden: false, pinned: false },
    { widgetId: 'goals-overview',    colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'projects-overview', colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'notifications',     colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'recent-activity',   colSpan: 8,  hidden: false, pinned: false },
    { widgetId: 'system-health',     colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'ai-status',         colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'worker-status',     colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'storage-usage',     colSpan: 4,  hidden: false, pinned: false },
    { widgetId: 'org-overview',      colSpan: 4,  hidden: false, pinned: false }
  ];

  // ─── Span → CSS class map ──────────────────────────────────────────────────

  const SPAN_CLASS = {
    12: 'col-span-12',
    8:  'col-span-8',
    6:  'col-span-6',
    4:  'col-span-4',
    3:  'col-span-3',
    2:  'col-span-2',
    1:  'col-span-1'
  };

  // ─── Layout Engine ─────────────────────────────────────────────────────────

  function createLayoutEngine({ userId = 'guest', storageKey = 'sunave_dash_layout' } = {}) {
    const _key = `${storageKey}:${userId}`;
    let _layout = _load();
    let _grid = null; // The DOM grid container

    // ── Persistence ──────────────────────────────────────────────────────────

    function _load() {
      try {
        const raw = localStorage.getItem(_key);
        if (raw) return JSON.parse(raw);
      } catch (_) { /* ignore */ }
      return DEFAULT_LAYOUT.map(item => ({ ...item }));
    }

    function _save() {
      try { localStorage.setItem(_key, JSON.stringify(_layout)); } catch (_) { /* ignore */ }
    }

    function _getItem(widgetId) {
      return _layout.find(item => item.widgetId === widgetId);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Attach the layout engine to a grid DOM element.
     * Sets up drag-and-drop on widget children.
     * @param {HTMLElement} gridEl
     */
    function attach(gridEl) {
      _grid = gridEl;
      _initDragDrop();
    }

    function getLayout() {
      return _layout.map(item => ({ ...item }));
    }

    /**
     * Move widget to a new position in the order.
     * @param {string} id - Widget id to move
     * @param {number} targetIndex - Target index in the layout array
     */
    function moveWidget(id, targetIndex) {
      const fromIndex = _layout.findIndex(item => item.widgetId === id);
      if (fromIndex === -1) return;
      const [item] = _layout.splice(fromIndex, 1);
      const clampedTarget = Math.max(0, Math.min(_layout.length, targetIndex));
      _layout.splice(clampedTarget, 0, item);
      _save();
      _renderGrid();
    }

    /**
     * Resize a widget by changing its colSpan.
     * @param {string} id
     * @param {number} colSpan - 1-12
     */
    function resizeWidget(id, colSpan) {
      const item = _getItem(id);
      if (item) {
        item.colSpan = colSpan;
        _save();
        _applySpan(id, colSpan);
      }
    }

    /**
     * Hide a widget from the grid (does not unregister it).
     * @param {string} id
     */
    function hideWidget(id) {
      const item = _getItem(id);
      if (item) {
        item.hidden = true;
        _save();
        const el = _getWidgetEl(id);
        if (el) el.style.display = 'none';
      }
    }

    /**
     * Show a previously hidden widget.
     * @param {string} id
     */
    function showWidget(id) {
      const item = _getItem(id);
      if (item) {
        item.hidden = false;
        _save();
        const el = _getWidgetEl(id);
        if (el) el.style.display = '';
      }
    }

    /**
     * Toggle pin state on a widget.
     * @param {string} id
     */
    function pinWidget(id) {
      const item = _getItem(id);
      if (item) {
        item.pinned = !item.pinned;
        _save();
        const el = _getWidgetEl(id);
        if (el) el.classList.toggle('pinned', item.pinned);
      }
    }

    /**
     * Reset the layout to platform defaults.
     */
    function restoreDefaults() {
      _layout = DEFAULT_LAYOUT.map(item => ({ ...item }));
      _save();
      _renderGrid();
    }

    /**
     * Re-render the grid order and visibility from current _layout state.
     * Only reorders/hides DOM nodes — does not re-render widget content.
     */
    function _renderGrid() {
      if (!_grid) return;
      for (const item of _layout) {
        const el = _getWidgetEl(item.widgetId);
        if (!el) continue;
        // Apply visibility
        el.style.display = item.hidden ? 'none' : '';
        // Apply pinned state
        el.classList.toggle('pinned', !!item.pinned);
        // Apply span class
        _applySpan(item.widgetId, item.colSpan);
        // Move to end (we'll reorder all)
        _grid.appendChild(el);
      }
    }

    function _applySpan(widgetId, colSpan) {
      const el = _getWidgetEl(widgetId);
      if (!el) return;
      // Remove all existing span classes
      for (const cls of Object.values(SPAN_CLASS)) el.classList.remove(cls);
      const spanClass = SPAN_CLASS[colSpan] ?? 'col-span-4';
      el.classList.add(spanClass);
    }

    function _getWidgetEl(widgetId) {
      if (!_grid) return null;
      return _grid.querySelector(`[data-widget-id="${widgetId}"]`);
    }

    // ── Drag and Drop ────────────────────────────────────────────────────────

    let _dragId = null;

    function _initDragDrop() {
      if (!_grid) return;

      _grid.addEventListener('dragstart', (e) => {
        const widget = e.target.closest('.widget');
        if (!widget) return;
        _dragId = widget.dataset.widgetId;
        widget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', _dragId);
      });

      _grid.addEventListener('dragend', (e) => {
        const widget = e.target.closest('.widget');
        if (widget) widget.classList.remove('dragging');
        _grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        _dragId = null;
      });

      _grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.target.closest('.widget');
        if (target && target.dataset.widgetId !== _dragId) {
          _grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
          target.classList.add('drag-over');
        }
      });

      _grid.addEventListener('dragleave', (e) => {
        const target = e.target.closest('.widget');
        if (target) target.classList.remove('drag-over');
      });

      _grid.addEventListener('drop', (e) => {
        e.preventDefault();
        const target = e.target.closest('.widget');
        if (!target || !_dragId || target.dataset.widgetId === _dragId) return;
        target.classList.remove('drag-over');

        const targetId = target.dataset.widgetId;
        const targetIndex = _layout.findIndex(item => item.widgetId === targetId);
        moveWidget(_dragId, targetIndex);
      });
    }

    // ── Initial apply ────────────────────────────────────────────────────────

    function applyInitial() {
      if (!_grid) return;
      for (const item of _layout) {
        const el = _getWidgetEl(item.widgetId);
        if (!el) continue;
        el.style.display = item.hidden ? 'none' : '';
        el.classList.toggle('pinned', !!item.pinned);
        _applySpan(item.widgetId, item.colSpan);
      }
    }

    return {
      attach,
      getLayout,
      moveWidget,
      resizeWidget,
      hideWidget,
      showWidget,
      pinWidget,
      restoreDefaults,
      applyInitial,
      SPAN_CLASS,
      DEFAULT_LAYOUT
    };
  }

  global.createLayoutEngine = createLayoutEngine;
  global.DASHBOARD_DEFAULT_LAYOUT = DEFAULT_LAYOUT;

})(window);
