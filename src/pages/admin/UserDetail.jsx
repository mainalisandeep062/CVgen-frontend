import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Crown,
  FileText,
  Info,
  Minus,
  Plus,
  Receipt,
  ShieldOff,
  Trash2,
  UserCheck,
} from 'lucide-react';

import Badge from '@/admin/components/Badge';
import TransactionsTable from '@/admin/components/TransactionsTable';
import UserAvatar from '@/admin/components/UserAvatar';
import { ConfirmModal } from '@/admin/components/Dialog';
import { Field } from '@/admin/components/Field';
import { EmptyState, ErrorState, SkeletonBlock } from '@/admin/components/States';
import { showToast } from '@/components/mockui/toast';
import {
  LIMITS,
  USER_ROLE,
  USER_STATUS,
  adjustUserCredits,
  deleteUser,
  getUser,
  updateUser,
} from '@/api/admin';
import { HTTP, apiMessage, apiStatus, fieldErrors, unwrap } from '@/api/response';
import { useAuth } from '@/context/AuthContext';
import { isCurrentUser } from '@/auth/roles';
import { usePageTitle } from '@/admin/pageContext';
import { formatDate, formatDateTime, formatNumber, timeAgo } from '@/admin/format';
import { cvStatusInfo, roleInfo, userStatusInfo } from '@/admin/labels';
import { providerLabel } from '@/lib/providers';

const EMPTY_CREDIT_FORM = { mode: 'grant', amount: '', note: '' };

function validateCreditForm(form, balance) {
  const errors = {};
  const amount = Number(form.amount);
  if (form.amount === '' || !Number.isInteger(amount)) {
    errors.amount = 'Enter a whole number of credits.';
  } else if (amount < 1 || amount > LIMITS.creditsAbs) {
    errors.amount = `Enter between 1 and ${LIMITS.creditsAbs.toLocaleString('en-US')} credits.`;
  } else if (form.mode === 'deduct' && amount > balance) {
    errors.amount = `This user only has ${formatNumber(balance)} credits — a balance can't go below zero.`;
  }
  const note = form.note.trim();
  if (!note) errors.note = 'A note is required so the change is explained in the audit log.';
  else if (note.length > LIMITS.creditNote) errors.note = `Keep the note under ${LIMITS.creditNote} characters.`;
  return errors;
}

/**
 * Admin User detail — `GET /api/admin/users/{id}` plus the account actions.
 *
 *   role / status   PATCH  /api/admin/users/{id}          behind a confirmation
 *   credits         POST   /api/admin/users/{id}/credits  grant (+) or deduct (−), note required
 *   delete          DELETE /api/admin/users/{id}          typed-email confirmation
 *
 * Role, status and delete are disabled for the admin's own account (JWT `id`
 * claim === userId) because the backend refuses them with 400 anyway; the hint
 * says why. 400/409 refusals (e.g. "last active admin") come back as the
 * server's localized message and are shown inside the confirmation, which stays
 * open. Credit form errors mirror the contract client-side and also map the
 * server's `field: message` list onto the inputs.
 */
export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();

  const [state, setState] = useState({ status: 'loading', data: null, error: null, notFound: false });
  const detail = state.data;
  usePageTitle(detail?.name || detail?.email || 'User', detail ? detail.email : 'Loading…');

  const [confirm, setConfirm] = useState(null); // { kind: 'role'|'status', value }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const [creditForm, setCreditForm] = useState(EMPTY_CREDIT_FORM);
  const [creditErrors, setCreditErrors] = useState({});
  const [creditBusy, setCreditBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const data = await getUser(userId);
      setState({ status: 'ready', data, error: null, notFound: false });
    } catch (error) {
      if (silent) return;
      setState({
        status: 'error',
        data: null,
        error: apiMessage(error, 'Could not load this user.'),
        notFound: apiStatus(error) === HTTP.NOT_FOUND,
      });
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'error') {
    return (
      <div className="adm-card">
        <ErrorState
          title={state.notFound ? 'User not found' : 'Could not load this user'}
          message={state.notFound ? 'This account may have been deleted.' : state.error}
          onRetry={state.notFound ? undefined : () => load()}
        />
        <div className="text-center" style={{ paddingBottom: '2rem' }}>
          <Link to="/admin/users" className="btn btn-ghost btn-sm">
            <ArrowLeft aria-hidden="true" /> Back to users
          </Link>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="adm-stack">
        <div className="adm-card adm-skel-card"><SkeletonBlock height={96} /></div>
        <div className="adm-grid-main">
          <div className="adm-card adm-skel-card"><SkeletonBlock height={220} /></div>
          <div className="adm-card adm-skel-card"><SkeletonBlock height={220} /></div>
        </div>
      </div>
    );
  }

  const isSelf = isCurrentUser(me, detail.userId);
  const roleBadge = roleInfo(detail.role);
  const statusBadge = userStatusInfo(detail.status);
  const isAdminUser = detail.role === USER_ROLE.ADMIN;
  const isSuspended = detail.status === USER_STATUS.SUSPENDED;
  const balance = Number(detail.creditBalance) || 0;
  const methods = [...(detail.hasPassword ? ['Password'] : []), ...(detail.providers ?? []).map(providerLabel)];

  const openConfirm = (kind, value) => {
    setConfirmError('');
    setConfirm({ kind, value });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError('');
    try {
      const response = await updateUser(detail.userId, { [confirm.kind]: confirm.value });
      const updated = unwrap(response);
      if (updated) setState((current) => ({ ...current, data: { ...current.data, ...updated } }));
      else await load({ silent: true });
      showToast(apiMessage(response, 'User updated.'));
      setConfirm(null);
    } catch (error) {
      setConfirmError(apiMessage(error, 'The change could not be saved.'));
    } finally {
      setConfirmBusy(false);
    }
  };

  const submitCredits = async (event) => {
    event.preventDefault();
    const errors = validateCreditForm(creditForm, balance);
    setCreditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const amount = Number(creditForm.amount);
    setCreditBusy(true);
    try {
      const response = await adjustUserCredits(detail.userId, {
        credits: creditForm.mode === 'deduct' ? -amount : amount,
        note: creditForm.note.trim(),
      });
      showToast(apiMessage(response, 'Credits adjusted.'));
      setCreditForm(EMPTY_CREDIT_FORM);
      setCreditErrors({});
      await load({ silent: true });
    } catch (error) {
      const server = fieldErrors(error);
      const mapped = {};
      if (server.credits) mapped.amount = server.credits;
      if (server.note) mapped.note = server.note;
      if (Object.keys(mapped).length === 0) mapped.form = apiMessage(error, 'Could not adjust credits.');
      setCreditErrors(mapped);
    } finally {
      setCreditBusy(false);
    }
  };

  const runDelete = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const response = await deleteUser(detail.userId);
      showToast(apiMessage(response, 'User deleted.'));
      navigate('/admin/users', { replace: true });
    } catch (error) {
      setDeleteError(apiMessage(error, 'Could not delete this user.'));
      setDeleteBusy(false);
    }
  };

  const setCreditField = (field) => (event) => {
    const value = event.target.value;
    setCreditForm((current) => ({ ...current, [field]: value }));
  };

  const amountNumber = Number(creditForm.amount);
  const previewBalance =
    creditForm.amount !== '' && Number.isInteger(amountNumber)
      ? balance + (creditForm.mode === 'deduct' ? -amountNumber : amountNumber)
      : null;

  const confirmCopy = confirm && {
    role: {
      [USER_ROLE.ADMIN]: {
        title: 'Make this user an admin?',
        message: `${detail.email} will get full access to the admin console, including users, billing and templates.`,
        label: 'Make admin',
        destructive: false,
      },
      [USER_ROLE.USER]: {
        title: 'Remove admin access?',
        message: `${detail.email} will lose access to the admin console immediately and be signed out of other sessions.`,
        label: 'Remove admin',
        destructive: true,
      },
    },
    status: {
      [USER_STATUS.SUSPENDED]: {
        title: 'Suspend this account?',
        message: `${detail.email} will be blocked from signing in and every open session will stop working.`,
        label: 'Suspend',
        destructive: true,
      },
      [USER_STATUS.ACTIVE]: {
        title: 'Reactivate this account?',
        message: `${detail.email} will be able to sign in again.`,
        label: 'Reactivate',
        destructive: false,
      },
    },
  }[confirm.kind][confirm.value];

  return (
    <div className="adm-stack">
      <Link to="/admin/users" className="btn btn-ghost btn-sm" style={{ marginLeft: '-0.5rem' }}>
        <ArrowLeft aria-hidden="true" /> All users
      </Link>

      <section className="adm-card">
        <div className="adm-profile">
          <UserAvatar name={detail.name} email={detail.email} src={detail.profilePictureUrl} size={68} />
          <div className="adm-profile-main">
            <div className="adm-profile-name">{detail.name || 'Unnamed user'}</div>
            <div className="adm-profile-email">{detail.email}</div>
            <div className="adm-badges">
              <Badge tone={roleBadge.tone}>{roleBadge.label}</Badge>
              <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
              <Badge tone={detail.emailVerified ? 'success' : 'warning'}>
                {detail.emailVerified ? 'Email verified' : 'Email unverified'}
              </Badge>
              {isSelf && <Badge tone="info">You</Badge>}
            </div>
          </div>
          <div className="adm-profile-balance">
            <div className="adm-stat-label">Credit balance</div>
            <div className="adm-profile-balance-value">{formatNumber(balance)}</div>
          </div>
        </div>
        <dl className="adm-kv">
          <div><dt>Joined</dt><dd title={formatDateTime(detail.createdAt)}>{formatDate(detail.createdAt)}</dd></div>
          <div><dt>Last login</dt><dd title={formatDateTime(detail.lastLoginAt)}>{timeAgo(detail.lastLoginAt)}</dd></div>
          <div><dt>Sign-in</dt><dd>{methods.length ? methods.join(', ') : '—'}</dd></div>
          <div><dt>CVs</dt><dd>{formatNumber(detail.cvCount)}</dd></div>
          <div><dt>User ID</dt><dd className="adm-mono adm-truncate" title={detail.userId}>{detail.userId}</dd></div>
        </dl>
      </section>

      <div className="adm-grid-main">
        <div className="adm-stack">
          <section className="adm-card">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Access</h2>
                <p className="adm-card-subtitle">Role and account status</p>
              </div>
            </div>
            <div className="adm-card-body">
              <div className="adm-actions-row">
                {isAdminUser ? (
                  <button type="button" className="btn btn-outline" disabled={isSelf} onClick={() => openConfirm('role', USER_ROLE.USER)}>
                    <ShieldOff aria-hidden="true" /> Remove admin
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary" disabled={isSelf} onClick={() => openConfirm('role', USER_ROLE.ADMIN)}>
                    <Crown aria-hidden="true" /> Make admin
                  </button>
                )}
                {isSuspended ? (
                  <button type="button" className="btn btn-outline" disabled={isSelf} onClick={() => openConfirm('status', USER_STATUS.ACTIVE)}>
                    <UserCheck aria-hidden="true" /> Reactivate
                  </button>
                ) : (
                  <button type="button" className="btn btn-destructive" disabled={isSelf} onClick={() => openConfirm('status', USER_STATUS.SUSPENDED)}>
                    <Ban aria-hidden="true" /> Suspend
                  </button>
                )}
              </div>
              {isSelf && (
                <p className="adm-hint">
                  <Info aria-hidden="true" />
                  This is your own account. Ask another admin to change your role or status — the server refuses self-changes.
                </p>
              )}
            </div>
          </section>

          <section className="adm-card">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Recent transactions</h2>
                <p className="adm-card-subtitle">Latest 10 credit movements</p>
              </div>
            </div>
            <div className="adm-card-body flush">
              {(detail.recentTransactions ?? []).length === 0 ? (
                <EmptyState compact icon={Receipt} title="No transactions yet" />
              ) : (
                <TransactionsTable items={detail.recentTransactions} showUser={false} />
              )}
            </div>
          </section>

          <section className="adm-card">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Recent CVs</h2>
                <p className="adm-card-subtitle">Latest 10, most recently edited first</p>
              </div>
            </div>
            <div className="adm-card-body">
              {(detail.recentCvs ?? []).length === 0 ? (
                <EmptyState compact icon={FileText} title="No CVs yet" />
              ) : (
                <ul className="adm-list">
                  {detail.recentCvs.map((cv) => {
                    const badge = cvStatusInfo(cv.status);
                    return (
                      <li key={cv.id}>
                        <span className="icon-chip" aria-hidden="true"><FileText /></span>
                        <div className="min-w-0 flex-1">
                          <div className="adm-list-title adm-truncate">{cv.title}</div>
                          <div className="adm-list-sub">
                            {cv.templateKey} · {cv.locale} · edited {timeAgo(cv.updatedAt, '—')}
                          </div>
                        </div>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="adm-stack">
          <section className="adm-card">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Adjust credits</h2>
                <p className="adm-card-subtitle">Recorded as an admin grant or deduction</p>
              </div>
            </div>
            <form className="adm-card-body" onSubmit={submitCredits} noValidate>
              <div className="segmented mb-4" role="radiogroup" aria-label="Adjustment type">
                {[
                  ['grant', 'Grant', Plus],
                  ['deduct', 'Deduct', Minus],
                ].map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={creditForm.mode === mode}
                    className={`segmented-btn${creditForm.mode === mode ? ' active' : ''}`}
                    onClick={() => setCreditForm((current) => ({ ...current, mode }))}
                  >
                    <Icon size={14} aria-hidden="true" style={{ marginRight: 4, verticalAlign: -2 }} />
                    {label}
                  </button>
                ))}
              </div>

              <Field label="Credits" htmlFor="credit-amount" required error={creditErrors.amount} hint={`1 – ${LIMITS.creditsAbs.toLocaleString('en-US')}`}>
                <input
                  id="credit-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={LIMITS.creditsAbs}
                  step={1}
                  className="input"
                  value={creditForm.amount}
                  onChange={setCreditField('amount')}
                  aria-invalid={creditErrors.amount ? 'true' : undefined}
                  aria-describedby={creditErrors.amount ? 'credit-amount-error' : 'credit-amount-hint'}
                />
              </Field>
              {previewBalance !== null && (
                <p className="adm-balance-preview">
                  New balance: <strong className={previewBalance < 0 ? 'adm-neg' : ''}>{formatNumber(previewBalance)}</strong>
                </p>
              )}

              <Field
                label="Note"
                htmlFor="credit-note"
                required
                error={creditErrors.note}
                counter={`${creditForm.note.length}/${LIMITS.creditNote}`}
              >
                <textarea
                  id="credit-note"
                  className="textarea"
                  rows={3}
                  maxLength={LIMITS.creditNote}
                  placeholder="e.g. Compensation for a failed export"
                  value={creditForm.note}
                  onChange={setCreditField('note')}
                  aria-invalid={creditErrors.note ? 'true' : undefined}
                />
              </Field>

              {creditErrors.form && (
                <div className="alert alert-danger mb-4" role="alert">
                  <Info aria-hidden="true" />
                  <span>{creditErrors.form}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={creditBusy}>
                {creditBusy ? 'Saving…' : creditForm.mode === 'deduct' ? 'Deduct credits' : 'Grant credits'}
              </button>
            </form>
          </section>

          <section className="adm-card adm-danger-zone">
            <div className="adm-card-header">
              <div>
                <h2 className="adm-card-title">Danger zone</h2>
                <p className="adm-card-subtitle">Deleting removes the account, its CVs and its transactions for good.</p>
              </div>
            </div>
            <div className="adm-card-body">
              <button
                type="button"
                className="btn btn-danger-solid"
                disabled={isSelf}
                onClick={() => {
                  setDeleteText('');
                  setDeleteError('');
                  setDeleteOpen(true);
                }}
              >
                <Trash2 aria-hidden="true" /> Delete user
              </button>
              {isSelf && (
                <p className="adm-hint">
                  <Info aria-hidden="true" /> You can&apos;t delete your own account from here.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirmCopy?.title}
        message={confirmCopy?.message}
        confirmLabel={confirmCopy?.label}
        destructive={confirmCopy?.destructive}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Delete this user permanently?"
        message="This removes the account, every CV, every transaction, linked sign-ins and notifications. It cannot be undone."
        confirmLabel="Delete user"
        destructive
        busy={deleteBusy}
        error={deleteError}
        confirmDisabled={deleteText.trim().toLowerCase() !== String(detail.email).toLowerCase()}
        onConfirm={runDelete}
        onCancel={() => setDeleteOpen(false)}
      >
        <Field label={<>Type <strong>{detail.email}</strong> to confirm</>} htmlFor="delete-confirm" className="mt-3">
          <input
            id="delete-confirm"
            type="text"
            className="input"
            autoComplete="off"
            spellCheck={false}
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            data-autofocus
          />
        </Field>
      </ConfirmModal>
    </div>
  );
}
