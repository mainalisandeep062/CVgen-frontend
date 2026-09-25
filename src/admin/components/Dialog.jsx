import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

/** Open dialogs, innermost last — only the top one reacts to Escape/Tab. */
const openStack = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog — admin modal with a focus trap, Escape to close and focus restore.
 *
 * Built on the shared `.modal-overlay` / `.modal` styles. On open, focus moves
 * to the first `[data-autofocus]` element (or the first focusable one); Tab and
 * Shift+Tab cycle inside the dialog; Escape and an overlay click call `onClose`
 * unless `busy`. On close, focus returns to whatever had it before. Stacked
 * dialogs are handled: only the topmost reacts to the keyboard.
 *
 * The overlay is portalled to <body>: `.modal-overlay` is `position: fixed`,
 * and a fixed descendant of an element with `backdrop-filter` (the admin top
 * bar, the app nav) is laid out against that element instead of the viewport.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  busy = false,
  hideClose = false,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    openStack.push(token);
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll(FOCUSABLE) ?? []);

    const initial = panel?.querySelector('[data-autofocus]') || focusables()[0] || panel;
    initial?.focus?.();

    const onKeyDown = (event) => {
      if (openStack[openStack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!busyRef.current) onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openStack.indexOf(token);
      if (index >= 0) openStack.splice(index, 1);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`modal adm-dialog size-${size}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div className="min-w-0">
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="adm-dialog-desc" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          {!hideClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * ConfirmModal — confirmation on top of Dialog.
 *
 * Cancel gets initial focus so a blind Enter is never destructive (unless the
 * children contain their own `data-autofocus` input, e.g. a typed-email check).
 * `error` shows the server's refusal inline (a 409 "template in use", say) and
 * keeps the dialog open so the admin actually reads it.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      role="alertdialog"
      size="sm"
      busy={busy}
      hideClose
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy} data-autofocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="adm-confirm">
        <span className={`icon-chip ${destructive ? 'tone-danger' : ''}`} aria-hidden="true">
          {destructive ? <AlertTriangle /> : <HelpCircle />}
        </span>
        <div className="adm-confirm-body">
          {message && <p className="confirm-message">{message}</p>}
          {children}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              <AlertTriangle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
