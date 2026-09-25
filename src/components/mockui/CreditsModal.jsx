import { useEffect, useState } from 'react';

import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import { apiMessage } from '@/api/response';
import { formatPrice, listCreditPacks } from '@/api/billing';

/**
 * CreditsModal — the credit packs, read from GET /api/billing/packs.
 *
 * THERE IS DELIBERATELY NO BUY BUTTON. No payment gateway is wired up, so the
 * only honest options were to hide the prices or to show them and say how
 * credits are actually obtained today (an admin grant). A "Pay" button that
 * settled instantly — what this modal used to do against the localStorage mock
 * — would hand out free credits the moment the balance became real.
 *
 * When a gateway lands, the flow is: POST a purchase intent, redirect to the
 * gateway, and let its server-verified callback create the PURCHASE
 * transaction. The balance then refreshes through `cvgen:credits-changed`.
 */
export default function CreditsModal({ open, onClose }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    listCreditPacks()
      .then((list) => {
        if (!cancelled) setPacks(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!cancelled) showToast(apiMessage(error, 'Could not load credit packs.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Credits"
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-muted text-sm mb-6">
        Credits unlock premium templates and AI enhancements. No subscription
        required.
      </p>

      {loading && packs.length === 0 && (
        <p className="text-muted text-sm">Loading packs…</p>
      )}

      {!loading && packs.length === 0 && (
        <p className="text-muted text-sm">No credit packs are available yet.</p>
      )}

      {packs.length > 0 && (
        <div className="credit-grid mb-6">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`credit-pack${pack.highlighted ? ' selected' : ''}`}
            >
              {pack.highlighted && <span className="pack-best">Best value</span>}
              <div className="pack-credits">{pack.credits}</div>
              <div className="pack-credits-label">credits</div>
              <div className="pack-price">
                {formatPrice(pack.priceMinor, pack.currency)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="alert alert-info" role="note">
        <span>
          Online payment isn&apos;t available yet. Ask an administrator to add
          credits to your account.
        </span>
      </div>
    </Modal>
  );
}
