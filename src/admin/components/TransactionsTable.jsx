import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';

import Badge from '@/admin/components/Badge';
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from '@/api/admin';
import { formatDateTime, formatMoney, formatNumber, formatSigned, timeAgo } from '@/admin/format';
import { txStatusInfo, txTypeInfo } from '@/admin/labels';

/** Only a completed purchase can be refunded (contract: 409 otherwise). */
function isRefundable(transaction) {
  return (
    transaction?.type === TRANSACTION_TYPE.PURCHASE &&
    transaction?.status === TRANSACTION_STATUS.COMPLETED
  );
}

/**
 * TransactionsTable — CreditTransaction rows.
 * `showUser` adds the user column (links to the user detail page);
 * `onRefund(tx)` adds a Refund action on refundable rows only.
 */
export default function TransactionsTable({ items, showUser = true, onRefund }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">When</th>
            {showUser && <th scope="col">User</th>}
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">Credits</th>
            <th scope="col" className="num">Balance after</th>
            <th scope="col" className="num">Amount</th>
            <th scope="col">Details</th>
            {onRefund && (
              <th scope="col" className="actions">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => {
            const type = txTypeInfo(tx.type);
            const status = txStatusInfo(tx.status);
            const detail = [tx.packName, tx.paymentMethod, tx.reference].filter(Boolean).join(' · ');
            return (
              <tr key={tx.id}>
                <td title={formatDateTime(tx.createdAt)}>
                  <div className="font-medium">{timeAgo(tx.createdAt, '—')}</div>
                  <div className="adm-muted text-xs">{formatDateTime(tx.createdAt)}</div>
                </td>
                {showUser && (
                  <td>
                    <Link to={`/admin/users/${tx.userId}`} className="text-link">
                      {tx.userName || tx.userEmail || 'Unknown user'}
                    </Link>
                    {tx.userName && <div className="adm-muted text-xs adm-truncate" style={{ maxWidth: 220 }}>{tx.userEmail}</div>}
                  </td>
                )}
                <td><Badge tone={type.tone}>{type.label}</Badge></td>
                <td><Badge tone={status.tone}>{status.label}</Badge></td>
                <td className={`num ${tx.credits > 0 ? 'adm-pos' : tx.credits < 0 ? 'adm-neg' : ''}`}>
                  {formatSigned(tx.credits)}
                </td>
                <td className="num">{formatNumber(tx.balanceAfter)}</td>
                <td className="num">{tx.amountMinor ? formatMoney(tx.amountMinor, tx.currency) : '—'}</td>
                <td style={{ maxWidth: 260 }}>
                  {detail && <div className="adm-truncate">{detail}</div>}
                  {tx.note && <div className="adm-muted text-xs adm-truncate" title={tx.note}>“{tx.note}”</div>}
                  {tx.createdByEmail && <div className="adm-muted text-xs adm-truncate">by {tx.createdByEmail}</div>}
                  {!detail && !tx.note && !tx.createdByEmail && <span className="adm-muted">—</span>}
                </td>
                {onRefund && (
                  <td className="actions">
                    {isRefundable(tx) && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => onRefund(tx)}>
                        <RotateCcw aria-hidden="true" />
                        Refund
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
