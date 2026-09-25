import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal — design-system modal (.modal-overlay / .modal).
 * Renders nothing when closed; closes on overlay click or the close button.
 *
 * Portalled to <body> on purpose. `.modal-overlay` is `position: fixed`, and a
 * fixed descendant of an element with `backdrop-filter` (`.topnav`, the builder
 * toolbar) is positioned against THAT element instead of the viewport — the
 * overlay then collapses into the nav strip at the top of the page. The portal
 * keeps the modal out of any such containing block wherever it is mounted from.
 */
export default function Modal({ open, onClose, title, children, footer, large }) {
  if (!open) return null;
  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal${large ? ' modal-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
