import { animate, stagger } from 'https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm';
export function initAnimations() {
  const elements = document.querySelectorAll('.animate-in');
  if (elements.length > 0) {
    animate(elements, { opacity: [0, 1], y: [20, 0] }, { duration: 0.4, delay: stagger(0.1) });
  }
}
export function showSkeleton(containerId, type = 'card') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="skeleton-loader ' + type + '"><div class="skel skel-h2 skel-w-half"></div><div class="skel skel-h1 skel-w-full"></div><div class="skel skel-h1 skel-w-3q"></div></div>';
}
export function showEmptyState(containerId, title, message, icon = '📂') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="empty-state" role="region" aria-label="Empty state"><div class="empty-icon" aria-hidden="true">' + icon + '</div><h3>' + title + '</h3><p>' + message + '</p></div>';
}
export function showErrorBoundary(containerId, error) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="error-boundary" role="alert"><div class="error-icon" aria-hidden="true">⚠️</div><h3>Something went wrong</h3><p>' + (error.message || 'An unexpected error occurred.') + '</p><button onclick="window.location.reload()" class="btn btn-primary">Reload Page</button></div>';
}
document.addEventListener('DOMContentLoaded', initAnimations);
