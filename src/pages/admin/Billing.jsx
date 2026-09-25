import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Coins,
  CreditCard,
  Package,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Star,
  Trash2,
  Wallet,
} from 'lucide-react';

import Badge from '@/admin/components/Badge';
import ChartTooltip from '@/admin/components/ChartTooltip';
import Pagination from '@/admin/components/Pagination';
import SearchInput from '@/admin/components/SearchInput';
import StatCard from '@/admin/components/StatCard';
import TransactionsTable from '@/admin/components/TransactionsTable';
import { ConfirmModal, Dialog } from '@/admin/components/Dialog';
import { Field, FormRow, RangeSelect, Switch } from '@/admin/components/Field';
import { EmptyState, ErrorState, SkeletonBlock, SkeletonCards, SkeletonRows } from '@/admin/components/States';
import { showToast } from '@/components/mockui/toast';
import {
  ADMIN_PAGE_SIZE,
  LIMITS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  createCreditPack,
  deleteCreditPack,
  fetchBillingSummary,
  listCreditPacks,
  listTransactions,
  refundTransaction,
  updateCreditPack,
} from '@/api/admin';
import { apiMessage, fieldErrors, unwrap } from '@/api/response';
import { usePageTitle } from '@/admin/pageContext';
import { AXIS_TICK, CHART } from '@/admin/chartTheme';
import {
  formatDay,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  minorToMajorInput,
  pluralise,
  parseMajorToMinor,
} from '@/admin/format';
import { txStatusInfo, txTypeInfo } from '@/admin/labels';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', Icon: Receipt },
  { id: 'packs', label: 'Credit packs', Icon: Package },
];

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab() {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    try {
      const data = await fetchBillingSummary(days);
      if (id === requestId.current) setState({ status: 'ready', data, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState({ status: 'error', data: null, error: apiMessage(error, 'Could not load the billing summary.') });
      }
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const { status, data, error } = state;

  const header = (
    <div className="adm-page-actions">
      <span className="adm-page-actions-lead">
        Last {days} days{status === 'loading' && data ? ' · refreshing…' : ''}
      </span>
      <RangeSelect value={days} onChange={setDays} />
    </div>
  );

  if (status === 'error') {
    return (
      <>
        {header}
        <div className="adm-card">
          <ErrorState title="Billing data is unavailable" message={error} onRetry={load} />
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {header}
        <div className="adm-kpis">
          <SkeletonCards count={4} />
        </div>
      </>
    );
  }

  const currency = data.currency || 'NPR';
  const series = data.series ?? [];
  const topPacks = [...(data.topPacks ?? [])].sort((a, b) => (b.revenueMinor || 0) - (a.revenueMinor || 0));
  const maxPackRevenue = Math.max(1, ...topPacks.map((pack) => pack.revenueMinor || 0));
  const methods = data.paymentMethods ?? [];

  return (
    <>
      {header}
      <div className="adm-stack">
        <div className="adm-kpis">
          <StatCard label="Revenue" value={formatMoney(data.revenueMinor, currency)} icon={Wallet} hint={pluralise(data.purchases, 'purchase')} />
          <StatCard label="Refunds" value={formatMoney(data.refundsMinor, currency)} icon={RotateCcw} tone="danger" hint="Returned to users" />
          <StatCard label="Average order" value={formatMoney(data.averageOrderMinor, currency)} icon={ShoppingCart} tone="info" hint="Per completed purchase" />
          <StatCard label="Credits sold" value={formatNumber(data.creditsSold)} icon={Coins} tone="warning" hint={`${formatNumber(data.creditsSpent)} spent by users`} />
          <StatCard label="Credits granted" value={formatNumber(data.creditsGranted)} icon={Plus} tone="success" hint="By admins" />
          <StatCard label="Credits deducted" value={formatNumber(data.creditsDeducted)} icon={Trash2} tone="danger" hint="By admins" />
        </div>

        <section className="adm-card">
          <div className="adm-card-header">
            <div>
              <h2 className="adm-card-title">Revenue over time</h2>
              <p className="adm-card-subtitle">Completed purchases per day (UTC)</p>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="adm-chart" role="img" aria-label={`Revenue per day over ${days} days, ${formatMoney(data.revenueMinor, currency)} in total.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickFormatter={formatMoneyCompact} tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    content={<ChartTooltip formatLabel={formatDay} formatValue={(value, name) => (name === 'Revenue' ? formatMoney(value, currency) : formatNumber(value))} />}
                    cursor={{ fill: 'rgba(90, 77, 230, 0.06)' }}
                  />
                  <Bar dataKey="revenueMinor" name="Revenue" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <div className="adm-grid-2">
          <section className="adm-card">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Top packs</h2>
                <p className="adm-card-subtitle">Revenue per credit pack</p>
              </div>
            </div>
            <div className="adm-card-body">
              {topPacks.length === 0 ? (
                <EmptyState compact icon={Package} title="No purchases in this range" />
              ) : (
                <div className="adm-bars">
                  {topPacks.map((pack) => (
                    <div className="adm-bar-row" key={pack.packId ?? pack.name}>
                      <span className="adm-bar-label adm-truncate" title={pack.name}>
                        {pack.name}
                        <span className="adm-muted"> · {formatNumber(pack.purchases)}×</span>
                      </span>
                      <span className="adm-bar-track" aria-hidden="true">
                        <span className="adm-bar-fill" style={{ width: `${((pack.revenueMinor || 0) / maxPackRevenue) * 100}%`, display: 'block' }} />
                      </span>
                      <span className="adm-bar-value">{formatMoney(pack.revenueMinor, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="adm-card">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Payment methods</h2>
                <p className="adm-card-subtitle">How people paid</p>
              </div>
            </div>
            <div className="adm-card-body flush">
              {methods.length === 0 ? (
                <EmptyState compact icon={CreditCard} title="No payments in this range" />
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">Method</th>
                        <th scope="col" className="num">Purchases</th>
                        <th scope="col" className="num">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {methods.map((method) => (
                        <tr key={method.method ?? 'unknown'}>
                          <td className="font-medium">{method.method || 'Unknown'}</td>
                          <td className="num">{formatNumber(method.purchases)}</td>
                          <td className="num">{formatMoney(method.revenueMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Transactions tab                                                    */
/* ------------------------------------------------------------------ */

function TransactionsTab() {
  const [filters, setFilters] = useState({ q: '', type: '', status: '' });
  const [page, setPage] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [refund, setRefund] = useState(null);
  const [refundNote, setRefundNote] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    try {
      const data = await listTransactions({ ...filters, q: filters.q.trim(), page, size: ADMIN_PAGE_SIZE });
      if (id === requestId.current) setState({ status: 'ready', data, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState({ status: 'error', data: null, error: apiMessage(error, 'Could not load transactions.') });
      }
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const openRefund = (transaction) => {
    setRefundNote('');
    setRefundError('');
    setRefund(transaction);
  };

  const runRefund = async () => {
    setRefundBusy(true);
    setRefundError('');
    try {
      const response = await refundTransaction(refund.id, { note: refundNote.trim() || undefined });
      showToast(apiMessage(response, 'Refund recorded.'));
      setRefund(null);
      await load();
    } catch (error) {
      setRefundError(apiMessage(error, 'Could not refund this transaction.'));
    } finally {
      setRefundBusy(false);
    }
  };

  const items = state.data?.items ?? [];
  const filtersActive = Boolean(filters.q || filters.type || filters.status);

  return (
    <section className="adm-card">
      <div className="adm-toolbar">
        <SearchInput
          value={filters.q}
          onChange={(value) => setFilter('q', value)}
          placeholder="Search user name or email"
          label="Search transactions"
        />
        <select className="input adm-select" aria-label="Filter by type" value={filters.type} onChange={(event) => setFilter('type', event.target.value)}>
          <option value="">All types</option>
          {Object.values(TRANSACTION_TYPE).map((type) => (
            <option key={type} value={type}>{txTypeInfo(type).label}</option>
          ))}
        </select>
        <select className="input adm-select" aria-label="Filter by status" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">Any status</option>
          {Object.values(TRANSACTION_STATUS).map((status) => (
            <option key={status} value={status}>{txStatusInfo(status).label}</option>
          ))}
        </select>
      </div>

      {state.status === 'error' && <ErrorState title="Could not load transactions" message={state.error} onRetry={load} />}

      {state.status !== 'error' && !state.data && <SkeletonRows rows={8} columns={6} />}

      {state.data && items.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={filtersActive ? 'No transactions match these filters' : 'No transactions yet'}
          message={filtersActive ? 'Try a different search or clear the filters.' : 'Purchases, grants and refunds will show up here.'}
          action={
            filtersActive && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setPage(0); setFilters({ q: '', type: '', status: '' }); }}>
                Clear filters
              </button>
            )
          }
        />
      )}

      {state.data && items.length > 0 && (
        <>
          <TransactionsTable items={items} onRefund={openRefund} />
          <Pagination
            page={state.data.page ?? page}
            size={state.data.size ?? ADMIN_PAGE_SIZE}
            totalElements={state.data.totalElements}
            totalPages={state.data.totalPages}
            disabled={state.status === 'loading'}
            onChange={setPage}
          />
        </>
      )}

      <Dialog
        open={Boolean(refund)}
        onClose={() => setRefund(null)}
        busy={refundBusy}
        size="sm"
        title="Refund this purchase?"
        description="The purchase is marked refunded and a matching refund transaction is recorded."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRefund(null)} disabled={refundBusy} data-autofocus>
              Cancel
            </button>
            <button type="button" className="btn btn-danger-solid" onClick={runRefund} disabled={refundBusy}>
              {refundBusy ? 'Refunding…' : `Refund ${formatMoney(refund?.amountMinor, refund?.currency)}`}
            </button>
          </>
        }
      >
        {refund && (
          <>
            <div className="kv-panel">
              <div className="kv-row"><span className="font-semibold">User</span><span>{refund.userEmail}</span></div>
              <div className="kv-row"><span className="font-semibold">Pack</span><span>{refund.packName || '—'}</span></div>
              <div className="kv-row"><span className="font-semibold">Credits</span><span>{formatNumber(refund.credits)} will be reversed</span></div>
              <div className="kv-row"><span className="font-semibold">Amount</span><span>{formatMoney(refund.amountMinor, refund.currency)}</span></div>
            </div>
            <Field label="Note" htmlFor="refund-note" hint="Optional — stored with the refund and the audit log." counter={`${refundNote.length}/${LIMITS.refundNote}`}>
              <textarea
                id="refund-note"
                className="textarea"
                rows={3}
                maxLength={LIMITS.refundNote}
                value={refundNote}
                placeholder="e.g. Duplicate payment"
                onChange={(event) => setRefundNote(event.target.value)}
              />
            </Field>
            <p className="adm-hint">
              <AlertTriangle aria-hidden="true" />
              If the user has already spent these credits, the server refuses the refund rather than letting the balance go negative.
            </p>
            {refundError && (
              <div className="alert alert-danger mt-3" role="alert">
                <AlertTriangle aria-hidden="true" />
                <span>{refundError}</span>
              </div>
            )}
          </>
        )}
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Credit packs tab                                                    */
/* ------------------------------------------------------------------ */

function emptyPack() {
  return { name: '', credits: '', price: '', active: true, highlighted: false, sortOrder: '0' };
}

function packToForm(pack) {
  return {
    name: pack.name ?? '',
    credits: String(pack.credits ?? ''),
    price: minorToMajorInput(pack.priceMinor),
    active: pack.active !== false,
    highlighted: Boolean(pack.highlighted),
    sortOrder: String(pack.sortOrder ?? 0),
  };
}

function validatePack(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  else if (form.name.trim().length > LIMITS.packName) errors.name = `Keep it under ${LIMITS.packName} characters.`;

  const credits = Number(form.credits);
  if (!Number.isInteger(credits) || credits < 1 || credits > LIMITS.packCreditsMax) {
    errors.credits = `Enter a whole number from 1 to ${LIMITS.packCreditsMax.toLocaleString('en-US')}.`;
  }

  const priceMinor = parseMajorToMinor(form.price);
  if (priceMinor === null) errors.price = 'Enter an amount like 600 or 600.50.';
  else if (priceMinor > LIMITS.packPriceMinorMax) errors.price = 'That price is too large.';

  if (!/^-?\d+$/.test(String(form.sortOrder).trim())) errors.sortOrder = 'Enter a whole number.';
  return errors;
}

function PackForm({ open, pack, onClose, onSaved }) {
  const isCreate = !pack;
  const [form, setForm] = useState(() => (pack ? packToForm(pack) : emptyPack()));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validatePack(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        credits: Number(form.credits),
        priceMinor: parseMajorToMinor(form.price),
        active: form.active,
        highlighted: form.highlighted,
        sortOrder: Number(form.sortOrder),
      };
      const response = isCreate ? await createCreditPack(body) : await updateCreditPack(pack.id, body);
      showToast(apiMessage(response, isCreate ? 'Credit pack created.' : 'Credit pack saved.'));
      onSaved(unwrap(response));
    } catch (error) {
      const server = fieldErrors(error);
      const mapped = {};
      if (server.name) mapped.name = server.name;
      if (server.credits) mapped.credits = server.credits;
      if (server.priceMinor) mapped.price = server.priceMinor;
      if (server.sortOrder) mapped.sortOrder = server.sortOrder;
      if (Object.keys(mapped).length === 0) mapped.form = apiMessage(error, 'Could not save the credit pack.');
      setErrors(mapped);
    } finally {
      setBusy(false);
    }
  };

  const priceMinor = parseMajorToMinor(form.price);
  const credits = Number(form.credits);
  const perCredit = priceMinor !== null && Number.isInteger(credits) && credits > 0 ? priceMinor / credits : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title={isCreate ? 'New credit pack' : `Edit “${pack.name}”`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="pack-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : isCreate ? 'Create pack' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="pack-form" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="pack-name" required error={errors.name} counter={`${form.name.length}/${LIMITS.packName}`}>
          <input id="pack-name" className="input" maxLength={LIMITS.packName} value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={errors.name ? 'true' : undefined} data-autofocus />
        </Field>

        <FormRow>
          <Field label="Credits" htmlFor="pack-credits" required error={errors.credits}>
            <input id="pack-credits" type="number" min={1} max={LIMITS.packCreditsMax} step={1} className="input" value={form.credits} onChange={(e) => set('credits', e.target.value)} aria-invalid={errors.credits ? 'true' : undefined} />
          </Field>
          <Field
            label="Price (NPR)"
            htmlFor="pack-price"
            required
            error={errors.price}
            hint={perCredit !== null ? `${formatMoney(Math.round(perCredit))} per credit` : 'Entered in rupees, stored in paisa.'}
          >
            <input id="pack-price" type="text" inputMode="decimal" className="input" placeholder="600.00" value={form.price} onChange={(e) => set('price', e.target.value)} aria-invalid={errors.price ? 'true' : undefined} />
          </Field>
        </FormRow>

        <FormRow>
          <div>
            <Switch id="pack-active" checked={form.active} onChange={(value) => set('active', value)} label="Active" description="Inactive packs are hidden from users." />
            <Switch id="pack-highlighted" checked={form.highlighted} onChange={(value) => set('highlighted', value)} label="Highlighted" description="Shown as the best value." />
          </div>
          <Field label="Sort order" htmlFor="pack-sort" error={errors.sortOrder} hint="Lower numbers show first.">
            <input id="pack-sort" type="number" step={1} className="input" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} aria-invalid={errors.sortOrder ? 'true' : undefined} />
          </Field>
        </FormRow>

        {errors.form && (
          <div className="alert alert-danger" role="alert">
            <AlertTriangle aria-hidden="true" />
            <span>{errors.form}</span>
          </div>
        )}
      </form>
    </Dialog>
  );
}

function PacksTab() {
  const [state, setState] = useState({ status: 'loading', packs: [], error: null });
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const packs = await listCreditPacks();
      setState({ status: 'ready', packs, error: null });
    } catch (error) {
      setState({ status: 'error', packs: [], error: apiMessage(error, 'Could not load credit packs.') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runDelete = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const response = await deleteCreditPack(deleteTarget.id);
      showToast(apiMessage(response, 'Credit pack deleted.'));
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setDeleteError(apiMessage(error, 'Could not delete this credit pack.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (state.status === 'error') {
    return (
      <div className="adm-card">
        <ErrorState title="Could not load credit packs" message={state.error} onRetry={load} />
      </div>
    );
  }

  const loading = state.status === 'loading' && state.packs.length === 0;

  return (
    <>
      <div className="adm-page-actions">
        <span className="adm-page-actions-lead">
          {loading ? 'Loading…' : `${state.packs.length} pack${state.packs.length === 1 ? '' : 's'}`}
        </span>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')} disabled={loading}>
          <Plus aria-hidden="true" /> New pack
        </button>
      </div>

      <section className="adm-card">
        {loading && <SkeletonRows rows={4} columns={5} />}

        {!loading && state.packs.length === 0 && (
          <EmptyState
            icon={Package}
            title="No credit packs yet"
            message="Create the packs users can buy credits with."
            action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><Plus aria-hidden="true" /> New pack</button>}
          />
        )}

        {!loading && state.packs.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="sr-only">Credit packs</caption>
              <thead>
                <tr>
                  <th scope="col">Pack</th>
                  <th scope="col" className="num">Credits</th>
                  <th scope="col" className="num">Price</th>
                  <th scope="col" className="num">Per credit</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Purchases</th>
                  <th scope="col" className="num">Order</th>
                  <th scope="col" className="actions"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {state.packs.map((pack) => (
                  <tr key={pack.id}>
                    <td>
                      <span className="adm-pack-name">
                        {pack.highlighted && <Star size={14} aria-label="Highlighted" />}
                        {pack.name}
                      </span>
                    </td>
                    <td className="num">{formatNumber(pack.credits)}</td>
                    <td className="num">{formatMoney(pack.priceMinor, pack.currency)}</td>
                    <td className="num">{pack.credits > 0 ? formatMoney(Math.round(pack.priceMinor / pack.credits), pack.currency) : '—'}</td>
                    <td><Badge tone={pack.active ? 'success' : 'neutral'}>{pack.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="num">{formatNumber(pack.purchases)}</td>
                    <td className="num">{pack.sortOrder}</td>
                    <td className="actions">
                      <button type="button" className="icon-btn" aria-label={`Edit ${pack.name}`} onClick={() => setEditing(pack)}>
                        <Pencil aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`Delete ${pack.name}`}
                        onClick={() => { setDeleteError(''); setDeleteTarget(pack); }}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <PackForm
          open
          pack={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this credit pack?"
        message={deleteTarget ? `“${deleteTarget.name}” will be removed. Packs already referenced by transactions can't be deleted — deactivate them instead.` : ''}
        confirmLabel="Delete pack"
        destructive
        busy={deleteBusy}
        error={deleteError}
        onConfirm={runDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Admin Billing — three tabs over the billing endpoints:
 *
 *   Overview      GET  /api/admin/billing/summary?days=N
 *   Transactions  GET  /api/admin/billing/transactions  + refund action
 *   Credit packs  GET/POST/PUT/DELETE /api/admin/billing/packs
 *
 * The active tab lives in `?tab=` so a reload or a shared link keeps it.
 * Refunds are only offered on COMPLETED PURCHASE rows (the server 409s on
 * anything else) and the refusal is shown inside the dialog.
 * Pack prices are typed in rupees and converted to minor units on submit.
 */
export default function Billing() {
  usePageTitle('Billing', 'Revenue, transactions and credit packs');
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TABS.some((item) => item.id === requested) ? requested : 'overview';

  const selectTab = (id) => {
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  const onTabKeyDown = (event) => {
    const index = TABS.findIndex((item) => item.id === tab);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectTab(TABS[(index + 1) % TABS.length].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectTab(TABS[(index - 1 + TABS.length) % TABS.length].id);
    }
  };

  return (
    <>
      <div className="adm-tabs" role="tablist" aria-label="Billing sections" onKeyDown={onTabKeyDown}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`billing-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`billing-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className="adm-tab"
            onClick={() => selectTab(id)}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`billing-panel-${tab}`} aria-labelledby={`billing-tab-${tab}`}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'transactions' && <TransactionsTab />}
        {tab === 'packs' && <PacksTab />}
      </div>
    </>
  );
}
