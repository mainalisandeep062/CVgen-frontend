/**
 * Lightweight toast matching the mock design system (.toast / .toast-container).
 * Deliberately DOM-driven (not React state) so any component can call it
 * without wiring a provider — same ergonomics as the original app.js helper.
 */
export function showToast(msg) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
