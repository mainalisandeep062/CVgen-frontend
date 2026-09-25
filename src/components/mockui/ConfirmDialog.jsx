import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * ConfirmDialog — a small yes/no modal for actions that should not fire on a
 * stray click (signing out, and later deletions).
 *
 * Built on the same `.modal-overlay` / `.modal` shell as Modal.jsx rather than
 * reusing that component, because a confirmation deliberately has no ✕ in the
 * header and no dismiss-by-anything-but-Cancel affordance beyond the overlay
 * and Escape. Cancel is autofocused so a blind Enter is never destructive.
 *
 * Portalled to <body> for the same reason Modal.jsx is: a `position: fixed`
 * overlay nested inside an element with `backdrop-filter` is positioned
 * against that element, not the viewport.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-body" style={{ paddingTop: '1.5rem' }}>
          <div className={`icon-chip confirm-icon ${destructive ? 'tone-danger' : ''}`} aria-hidden="true">
            {destructive ? <AlertTriangle /> : <HelpCircle />}
          </div>
          <div className="modal-title mb-2">{title}</div>
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={busy}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
