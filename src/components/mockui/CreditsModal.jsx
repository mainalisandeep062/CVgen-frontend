import { useEffect, useMemo, useState } from 'react';
import { Check, Coins, Info, Lock } from 'lucide-react';

import Modal from '@/components/mockui/Modal';
import { apiMessage } from '@/api/response';
import {
  GATEWAY,
  formatPrice,
  goToGateway,
  listCreditPacks,
  listGateways,
  startCheckout,
} from '@/api/billing';

const GATEWAY_INFO = {
  [GATEWAY.ESEWA]: { name: 'eSewa', hint: 'Pay with your eSewa wallet', tone: 'esewa' },
  [GATEWAY.KHALTI]: { name: 'Khalti', hint: 'Pay with your Khalti wallet', tone: 'khalti' },
};

/**
 * CreditsModal - "Buy credits".
 *
 * Packs come from GET /api/billing/packs and the payment methods from
 * GET /api/billing/gateways (only the ones the server has configured). Paying
 * is: POST /api/billing/checkout → goToGateway() leaves the app for eSewa /
 * Khalti → the gateway sends the browser back to /billing/return/<gateway>,
 * where BillingReturn confirms the order with the server. Nothing here grants
 * credits; the server does, and only after its own check with the gateway.
 *
 * With no gateway configured the packs are still shown (prices are real) but
 * the pay button is replaced by a note to ask an administrator.
 */
export default function CreditsModal({ open, onClose, balance = null }) {
  const [packs, setPacks] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [packId, setPackId] = useState(null);
  const [gateway, setGateway] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setPayError('');
    setPaying(false);

    Promise.all([
      listCreditPacks(),
      // A failed gateway read is treated as "none configured", not as a hard error.
      listGateways().catch(() => []),
    ])
      .then(([packList, gatewayList]) => {
        if (cancelled) return;
        const list = Array.isArray(packList) ? packList : [];
        const enabled = (Array.isArray(gatewayList) ? gatewayList : []).filter(
          (g) => GATEWAY_INFO[g]
        );
        setPacks(list);
        setGateways(enabled);
        setPackId((current) =>
          list.some((p) => p.id === current)
            ? current
            : (list.find((p) => p.highlighted) ?? list[0])?.id ?? null
        );
        setGateway((current) => (enabled.includes(current) ? current : enabled[0] ?? null));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(apiMessage(error, 'Could not load credit packs.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedPack = useMemo(() => packs.find((p) => p.id === packId) ?? null, [packs, packId]);
  const canPay = Boolean(selectedPack && gateway && !paying);

  const handlePay = async () => {
    if (!canPay) return;
    setPaying(true);
    setPayError('');
    try {
      const checkout = await startCheckout({ packId: selectedPack.id, gateway });
      // Leaves the page; keep the button busy until the browser navigates.
      goToGateway(checkout);
    } catch (error) {
      setPayError(apiMessage(error, 'Could not start the payment. Please try again.'));
      setPaying(false);
    }
  };

  const noGateways = !loading && !loadError && gateways.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buy credits"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={paying}>
            {noGateways ? 'Close' : 'Cancel'}
          </button>
          {!noGateways && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePay}
              disabled={!canPay}
            >
              <Lock aria-hidden="true" />
              {paying
                ? 'Redirecting…'
                : selectedPack
                  ? `Pay ${formatPrice(selectedPack.priceMinor, selectedPack.currency)}`
                  : 'Pay'}
            </button>
          )}
        </>
      }
    >
      <div className="buy-balance">
        <span className="icon-chip" aria-hidden="true">
          <Coins />
        </span>
        <div>
          <div className="buy-balance-value">
            {balance === null ? 'Your credits' : `You have ${balance} credit${balance === 1 ? '' : 's'}`}
          </div>
          <div className="text-sm text-muted">
            Credits unlock premium templates. Pay once, no subscription.
          </div>
        </div>
      </div>

      {loading && packs.length === 0 && (
        <div className="credit-grid mb-6" aria-busy="true">
          <div className="skeleton" style={{ height: 118 }} />
          <div className="skeleton" style={{ height: 118 }} />
          <div className="skeleton" style={{ height: 118 }} />
        </div>
      )}

      {loadError && (
        <div className="alert alert-danger mb-4" role="alert">
          <span>{loadError}</span>
        </div>
      )}

      {!loading && !loadError && packs.length === 0 && (
        <p className="text-muted text-sm mb-4">No credit packs are available yet.</p>
      )}

      {packs.length > 0 && (
        <>
          <div className="buy-section-label" id="buy-pack-label">Choose a pack</div>
          <div className="credit-grid buy-pack-grid" role="radiogroup" aria-labelledby="buy-pack-label">
            {packs.map((pack) => {
              const selected = pack.id === packId;
              return (
                <button
                  key={pack.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`credit-pack${selected ? ' selected' : ''}`}
                  onClick={() => setPackId(pack.id)}
                  disabled={paying}
                >
                  {pack.highlighted && <span className="pack-best">Best value</span>}
                  {selected && (
                    <span className="buy-check" aria-hidden="true">
                      <Check />
                    </span>
                  )}
                  <div className="pack-credits">{pack.credits}</div>
                  <div className="pack-credits-label">credits</div>
                  <div className="pack-price">{formatPrice(pack.priceMinor, pack.currency)}</div>
                  {pack.name && <div className="buy-pack-name">{pack.name}</div>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {gateways.length > 0 && packs.length > 0 && (
        <>
          <div className="buy-section-label" id="buy-method-label">Payment method</div>
          <div className="buy-methods" role="radiogroup" aria-labelledby="buy-method-label">
            {gateways.map((g) => {
              const info = GATEWAY_INFO[g];
              const selected = g === gateway;
              return (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`buy-method${selected ? ' selected' : ''}`}
                  onClick={() => setGateway(g)}
                  disabled={paying}
                >
                  <span className={`buy-method-mark ${info.tone}`}>{info.name}</span>
                  <span className="buy-method-hint">{info.hint}</span>
                  <span className="buy-radio" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-3">
            You&apos;ll be sent to {GATEWAY_INFO[gateway]?.name ?? 'the gateway'} to finish
            paying, then brought back here. Credits are added once the payment is verified.
          </p>
        </>
      )}

      {noGateways && (
        <div className="alert alert-info" role="note">
          <Info aria-hidden="true" />
          <span>
            Online payment isn&apos;t available right now. Ask an administrator to add
            credits to your account.
          </span>
        </div>
      )}

      {payError && (
        <div className="alert alert-danger mt-4" role="alert">
          <span>{payError}</span>
        </div>
      )}
    </Modal>
  );
}
