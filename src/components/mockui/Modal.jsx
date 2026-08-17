/**
 * Modal — mock design system modal (.modal-overlay / .modal).
 * Renders nothing when closed; closes on overlay click or the ✕ button.
 */
export default function Modal({ open, onClose, title, children, footer, large }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal${large ? ' modal-lg' : ''}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
