import { useState } from 'react';

import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import {
  CREDIT_PACKS,
  PAYMENT_METHODS,
  purchaseCredits,
} from '@/mock/credits';

/**
 * CreditsModal — purchase flow from the mock template, backed by the mock
 * credits service (localStorage wallet). The payment step is SIMULATED: no
 * eSewa/Khalti/ConnectIPS redirect exists server-side yet, so confirming
 * settles the pack instantly and toasts the outcome.
 */
export default function CreditsModal({ open, onClose, onPurchased }) {
  const [selectedPack, setSelectedPack] = useState('pack-15');
  const [method, setMethod] = useState('eSewa');

  const pack = CREDIT_PACKS.find((p) => p.id === selectedPack);

  const handlePay = () => {
    // MOCK: simulate the gateway redirect + settlement.
    showToast(`Redirecting to ${method}… (simulated)`);
    setTimeout(() => {
      const balance = purchaseCredits(selectedPack);
      showToast(`Payment successful — balance: ${balance} credits`);
      onPurchased?.(balance);
    }, 900);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Purchase Credits"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handlePay}>
            Pay NPR {pack?.priceNpr.toLocaleString()}
          </button>
        </>
      }
    >
      <p className="text-muted text-sm mb-4">
        Credits unlock premium templates and AI enhancements. No subscription
        required.
      </p>
      <div className="credit-grid mb-4">
        {CREDIT_PACKS.map((p) => (
          <div
            key={p.id}
            className={`credit-pack${selectedPack === p.id ? ' selected' : ''}`}
            onClick={() => setSelectedPack(p.id)}
          >
            {p.best && <div className="pack-best">Best Value</div>}
            <div className="pack-credits">{p.credits}</div>
            <div className="pack-price">NPR {p.priceNpr.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="font-medium text-sm mb-2">Payment Method</div>
      <div className="flex gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            className={`btn flex-1 text-sm ${method === m ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setMethod(m)}
          >
            {m}
          </button>
        ))}
      </div>
    </Modal>
  );
}
