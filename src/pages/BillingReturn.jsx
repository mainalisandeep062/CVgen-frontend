import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import { notifyCreditsChanged, openCreditsModal } from '@/components/mockui/creditsEvents';
import { ORDER_STATUS, confirmOrder } from '@/api/billing';
import { apiMessage } from '@/api/response';
import '@/styles/account.css';

const RETRY_DELAY_MS = 3000;
const MAX_ATTEMPTS = 6; // the first try plus five retries

const GATEWAY_NAME = { esewa: 'eSewa', khalti: 'Khalti' };

/** eSewa's `data` is base64 (sometimes URL-safe, sometimes with '+' turned into ' '). */
function decodeEsewaData(raw) {
  try {
    const normalized = raw.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Read the order id and the gateway's own verdict from the return URL.
 *
 *   eSewa success  ?data=<base64 json>   (transaction_uuid = our order id)
 *   eSewa failure  ?order=<id>&status=failed
 *   Khalti         ?purchase_order_id=<id>&pidx=…&status=Completed|User canceled|Expired…
 *
 * `hintFailed` is only a hint - the server's confirm is the truth. It is used
 * to stop polling a PENDING order the gateway already told us was abandoned.
 */
function parseReturn(gateway, params) {
  const key = (gateway || '').toLowerCase();
  if (key === 'esewa') {
    const data = params.get('data');
    if (data) {
      const decoded = decodeEsewaData(data);
      const status = String(decoded?.status || '').toUpperCase();
      return {
        orderId: decoded?.transaction_uuid || null,
        hintFailed: Boolean(status) && status !== 'COMPLETE',
      };
    }
    return {
      orderId: params.get('order'),
      hintFailed: (params.get('status') || '').toLowerCase() === 'failed',
    };
  }
  if (key === 'khalti') {
    const status = (params.get('status') || '').toLowerCase();
    return {
      orderId: params.get('purchase_order_id'),
      hintFailed: Boolean(status) && status !== 'completed' && status !== 'pending',
    };
  }
  return { orderId: params.get('order'), hintFailed: false };
}

/**
 * BillingReturn - where eSewa / Khalti send the browser after a payment.
 *
 * Confirms the order with the server (POST /api/billing/orders/{id}/confirm,
 * idempotent); the server checks with the gateway and only then grants
 * credits. A PENDING answer is retried every 3s a few times before settling on
 * a "still processing" state the user can re-check by hand.
 */
export default function BillingReturn() {
  const { gateway } = useParams();
  const [params] = useSearchParams();
  const { orderId, hintFailed } = useMemo(() => parseReturn(gateway, params), [gateway, params]);
  const gatewayName = GATEWAY_NAME[(gateway || '').toLowerCase()] ?? 'the payment gateway';

  // checking | completed | failed | canceled | pending | error | missing
  const [phase, setPhase] = useState(orderId ? 'checking' : 'missing');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!orderId) return undefined;
    let cancelled = false;
    let timer = null;
    let attempt = 0;

    const tick = async () => {
      attempt += 1;
      try {
        const result = await confirmOrder(orderId);
        if (cancelled) return;
        setOrder(result);
        const status = result?.status;
        if (status === ORDER_STATUS.COMPLETED) {
          setPhase('completed');
          notifyCreditsChanged();
        } else if (status === ORDER_STATUS.FAILED) {
          setPhase('failed');
        } else if (status === ORDER_STATUS.CANCELED) {
          setPhase('canceled');
        } else if (hintFailed) {
          setPhase('canceled');
        } else if (attempt < MAX_ATTEMPTS) {
          timer = setTimeout(tick, RETRY_DELAY_MS);
        } else {
          setPhase('pending');
        }
      } catch (err) {
        if (cancelled) return;
        setError(apiMessage(err, 'We could not confirm this payment right now.'));
        setPhase('error');
      }
    };

    setPhase('checking');
    setError('');
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, hintFailed, run]);

  const retry = useCallback(() => setRun((n) => n + 1), []);

  return (
    <>
      <TopNav />
      <main className="container billing-return">
        <div className="card billing-return-card" aria-live="polite">
          {phase === 'checking' && (
            <>
              <div className="splash-spinner billing-return-spinner" aria-hidden="true" />
              <h1 className="billing-return-title">Confirming your payment…</h1>
              <p className="billing-return-text">
                Checking with {gatewayName}. This usually takes a few seconds, please
                don&apos;t close this tab.
              </p>
            </>
          )}

          {phase === 'completed' && (
            <>
              <span className="billing-return-icon tone-success" aria-hidden="true">
                <CheckCircle2 />
              </span>
              <h1 className="billing-return-title">
                {order?.credits != null ? `${order.credits} credits added` : 'Payment complete'}
              </h1>
              <p className="billing-return-text">
                {order?.packName ? `${order.packName} · ` : ''}Paid with {gatewayName}.
              </p>
              {order?.balance != null && (
                <div className="billing-return-balance">
                  New balance: <strong>{order.balance}</strong> credits
                </div>
              )}
              <div className="billing-return-actions">
                <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
                <Link to="/builder" className="btn btn-primary">Open builder</Link>
              </div>
            </>
          )}

          {(phase === 'failed' || phase === 'canceled') && (
            <>
              <span
                className={`billing-return-icon ${phase === 'failed' ? 'tone-danger' : 'tone-warning'}`}
                aria-hidden="true"
              >
                {phase === 'failed' ? <XCircle /> : <AlertTriangle />}
              </span>
              <h1 className="billing-return-title">
                {phase === 'failed' ? 'Payment failed' : 'Payment canceled'}
              </h1>
              <p className="billing-return-text">
                {order?.failureReason ||
                  (phase === 'failed'
                    ? `${gatewayName} did not complete the payment.`
                    : 'The payment was not completed.')}{' '}
                No credits were added.
              </p>
              <div className="billing-return-actions">
                <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
                <button type="button" className="btn btn-primary" onClick={openCreditsModal}>
                  Try again
                </button>
              </div>
            </>
          )}

          {phase === 'pending' && (
            <>
              <span className="billing-return-icon tone-warning" aria-hidden="true">
                <Clock />
              </span>
              <h1 className="billing-return-title">Still processing</h1>
              <p className="billing-return-text">
                {gatewayName} hasn&apos;t confirmed this payment yet. Credits are added as soon
                as it does. You can check again in a moment.
              </p>
              <div className="billing-return-actions">
                <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
                <button type="button" className="btn btn-primary" onClick={retry}>
                  Check again
                </button>
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <span className="billing-return-icon tone-danger" aria-hidden="true">
                <XCircle />
              </span>
              <h1 className="billing-return-title">Couldn&apos;t confirm the payment</h1>
              <p className="billing-return-text">{error}</p>
              <div className="billing-return-actions">
                <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
                <button type="button" className="btn btn-primary" onClick={retry}>
                  Try again
                </button>
              </div>
            </>
          )}

          {phase === 'missing' && (
            <>
              <span className="billing-return-icon tone-warning" aria-hidden="true">
                <AlertTriangle />
              </span>
              <h1 className="billing-return-title">No payment to confirm</h1>
              <p className="billing-return-text">
                This link doesn&apos;t include an order. If you just paid, your credits will
                appear once the payment is verified.
              </p>
              <div className="billing-return-actions">
                <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
                <button type="button" className="btn btn-primary" onClick={openCreditsModal}>
                  Buy credits
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
