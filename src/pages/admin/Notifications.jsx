import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Info,
  Link as LinkIcon,
  Megaphone,
  Send,
  Trash2,
  User,
  Users,
  XCircle,
} from 'lucide-react';

import Badge from '@/admin/components/Badge';
import Pagination from '@/admin/components/Pagination';
import { ConfirmModal } from '@/admin/components/Dialog';
import { Field } from '@/admin/components/Field';
import { EmptyState, ErrorState, SkeletonRows } from '@/admin/components/States';
import { showToast } from '@/components/mockui/toast';
import {
  ADMIN_PAGE_SIZE,
  LIMITS,
  NOTIFICATION_AUDIENCE,
  NOTIFICATION_LEVEL,
  deleteNotification,
  listAdminNotifications,
  sendNotification,
} from '@/api/admin';
import { HTTP, apiMessage, apiStatus, fieldErrors } from '@/api/response';
import { usePageTitle } from '@/admin/pageContext';
import { formatDateTime, looksLikeEmail, timeAgo } from '@/admin/format';
import { levelInfo } from '@/admin/labels';

const LEVEL_ICON = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  CRITICAL: XCircle,
};

const EMPTY_FORM = {
  title: '',
  body: '',
  level: NOTIFICATION_LEVEL.INFO,
  link: '',
  audience: NOTIFICATION_AUDIENCE.ALL,
  recipientEmail: '',
};

function validate(form) {
  const errors = {};
  const title = form.title.trim();
  const body = form.body.trim();
  const link = form.link.trim();

  if (!title) errors.title = 'A title is required.';
  else if (title.length > LIMITS.notificationTitle) errors.title = `Keep it under ${LIMITS.notificationTitle} characters.`;

  if (!body) errors.body = 'A message is required.';
  else if (body.length > LIMITS.notificationBody) errors.body = `Keep it under ${LIMITS.notificationBody} characters.`;

  if (link) {
    if (link.length > LIMITS.notificationLink) errors.link = `Keep it under ${LIMITS.notificationLink} characters.`;
    else if (!link.startsWith('/') && !link.startsWith('https://')) {
      errors.link = 'Use an in-app path like /dashboard, or an https:// URL.';
    }
  }

  if (form.audience === NOTIFICATION_AUDIENCE.USER) {
    const email = form.recipientEmail.trim();
    if (!email) errors.recipientEmail = 'Who should receive this?';
    else if (!looksLikeEmail(email)) errors.recipientEmail = 'Enter a valid email address.';
  }

  return errors;
}

/**
 * Admin Notifications — compose a notification and review what was sent.
 *
 *   GET    /api/admin/notifications?page=&size=
 *   POST   /api/admin/notifications   { title, body, level, link?, audience, recipientEmail? }
 *   DELETE /api/admin/notifications/{id}
 *
 * The live preview mirrors what the user's notification bell will render.
 * A broadcast (audience ALL) asks for confirmation first, since it reaches
 * every account. An unknown recipient comes back as 404 and is shown on the
 * email field rather than as a toast.
 */
export default function Notifications() {
  usePageTitle('Notifications', 'Announcements and direct messages');

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [page, setPage] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    try {
      const data = await listAdminNotifications({ page, size: ADMIN_PAGE_SIZE });
      setState({ status: 'ready', data, error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error: apiMessage(error, 'Could not load notifications.') });
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const send = async () => {
    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        level: form.level,
        audience: form.audience,
      };
      const link = form.link.trim();
      if (link) payload.link = link;
      if (form.audience === NOTIFICATION_AUDIENCE.USER) payload.recipientEmail = form.recipientEmail.trim();

      const response = await sendNotification(payload);
      showToast(apiMessage(response, 'Notification sent.'));
      setForm(EMPTY_FORM);
      setErrors({});
      setConfirmOpen(false);
      if (page === 0) await load();
      else setPage(0);
    } catch (error) {
      setConfirmOpen(false);
      const server = fieldErrors(error);
      if (Object.keys(server).length) {
        setErrors(server);
      } else if (apiStatus(error) === HTTP.NOT_FOUND) {
        setErrors({ recipientEmail: apiMessage(error, 'No account with that email address.') });
      } else {
        setErrors({ form: apiMessage(error, 'Could not send this notification.') });
      }
    } finally {
      setSending(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (form.audience === NOTIFICATION_AUDIENCE.ALL) setConfirmOpen(true);
    else send();
  };

  const runDelete = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const response = await deleteNotification(deleteTarget.id);
      showToast(apiMessage(response, 'Notification deleted.'));
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setDeleteError(apiMessage(error, 'Could not delete this notification.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const PreviewIcon = LEVEL_ICON[form.level] ?? Info;
  const items = state.data?.items ?? [];

  return (
    <div className="adm-stack">
      <div className="adm-compose">
        <section className="adm-card">
          <div className="adm-card-header">
            <div>
              <h2 className="adm-card-title">Compose</h2>
              <p className="adm-card-subtitle">Sent to the in-app notification bell</p>
            </div>
          </div>
          <form className="adm-card-body" onSubmit={submit} noValidate>
            <Field label="Title" htmlFor="notif-title" required error={errors.title} counter={`${form.title.length}/${LIMITS.notificationTitle}`}>
              <input
                id="notif-title"
                className="input"
                maxLength={LIMITS.notificationTitle}
                value={form.title}
                placeholder="Scheduled maintenance on Friday"
                onChange={(event) => set('title', event.target.value)}
                aria-invalid={errors.title ? 'true' : undefined}
              />
            </Field>

            <Field label="Message" htmlFor="notif-body" required error={errors.body} counter={`${form.body.length}/${LIMITS.notificationBody}`}>
              <textarea
                id="notif-body"
                className="textarea"
                rows={4}
                maxLength={LIMITS.notificationBody}
                value={form.body}
                placeholder="CVGen will be unavailable for about 20 minutes from 9pm."
                onChange={(event) => set('body', event.target.value)}
                aria-invalid={errors.body ? 'true' : undefined}
              />
            </Field>

            <Field label="Level" error={errors.level}>
              <div className="segmented adm-level-picker" role="radiogroup" aria-label="Level">
                {Object.values(NOTIFICATION_LEVEL).map((level) => {
                  const Icon = LEVEL_ICON[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={form.level === level}
                      className={`segmented-btn${form.level === level ? ' active' : ''}`}
                      onClick={() => set('level', level)}
                    >
                      <Icon aria-hidden="true" />
                      {levelInfo(level).label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="Link"
              htmlFor="notif-link"
              error={errors.link}
              hint="Optional. An in-app path like /dashboard, or an https:// URL."
            >
              <input
                id="notif-link"
                className="input"
                maxLength={LIMITS.notificationLink}
                value={form.link}
                placeholder="/dashboard"
                onChange={(event) => set('link', event.target.value)}
                aria-invalid={errors.link ? 'true' : undefined}
              />
            </Field>

            <Field label="Audience" error={errors.audience}>
              <div className="segmented" role="radiogroup" aria-label="Audience">
                {[
                  [NOTIFICATION_AUDIENCE.ALL, 'Everyone', Users],
                  [NOTIFICATION_AUDIENCE.USER, 'One user', User],
                ].map(([audience, label, Icon]) => (
                  <button
                    key={audience}
                    type="button"
                    role="radio"
                    aria-checked={form.audience === audience}
                    className={`segmented-btn${form.audience === audience ? ' active' : ''}`}
                    onClick={() => set('audience', audience)}
                  >
                    <Icon size={14} aria-hidden="true" style={{ marginRight: 4, verticalAlign: -2 }} />
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            {form.audience === NOTIFICATION_AUDIENCE.USER && (
              <Field label="Recipient email" htmlFor="notif-recipient" required error={errors.recipientEmail}>
                <input
                  id="notif-recipient"
                  type="email"
                  className="input"
                  autoComplete="off"
                  value={form.recipientEmail}
                  placeholder="person@example.com"
                  onChange={(event) => set('recipientEmail', event.target.value)}
                  aria-invalid={errors.recipientEmail ? 'true' : undefined}
                />
              </Field>
            )}

            {errors.form && (
              <div className="alert alert-danger mb-4" role="alert">
                <AlertTriangle aria-hidden="true" />
                <span>{errors.form}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={sending}>
              <Send aria-hidden="true" />
              {sending ? 'Sending…' : form.audience === NOTIFICATION_AUDIENCE.ALL ? 'Send to everyone' : 'Send notification'}
            </button>
          </form>
        </section>

        <section className="adm-card">
          <div className="adm-card-header">
            <div>
              <h2 className="adm-card-title">Preview</h2>
              <p className="adm-card-subtitle">How it appears in the bell</p>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="adm-preview-shell">
              <div className="adm-preview-label">Notification</div>
              <div className={`adm-preview-card level-${form.level}`}>
                <span className={`icon-chip tone-${levelInfo(form.level).tone}`} aria-hidden="true">
                  <PreviewIcon />
                </span>
                <div className="min-w-0">
                  <div className="adm-preview-title">{form.title.trim() || 'Your title appears here'}</div>
                  <div className="adm-preview-body">{form.body.trim() || 'And the message body goes here.'}</div>
                  {form.link.trim() && (
                    <div className="adm-preview-meta">
                      <span className="adm-preview-link">
                        {form.link.trim().startsWith('https://') ? <ExternalLink aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
                        {form.link.trim()}
                      </span>
                    </div>
                  )}
                  <div className="adm-preview-meta">
                    <span>{levelInfo(form.level).label}</span>
                    <span aria-hidden="true">·</span>
                    <span>just now</span>
                  </div>
                </div>
              </div>
              <p className="adm-hint">
                <Info aria-hidden="true" />
                {form.audience === NOTIFICATION_AUDIENCE.ALL
                  ? 'Broadcasts reach every existing account. People who sign up later will not see it.'
                  : `Only ${form.recipientEmail.trim() || 'the chosen user'} sees this.`}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-header">
          <div>
            <h2 className="adm-card-title">Sent notifications</h2>
            <p className="adm-card-subtitle">Newest first</p>
          </div>
        </div>

        {state.status === 'error' && <ErrorState title="Could not load notifications" message={state.error} onRetry={load} />}

        {state.status !== 'error' && !state.data && <SkeletonRows rows={4} columns={3} />}

        {state.data && items.length === 0 && (
          <EmptyState icon={Megaphone} title="Nothing sent yet" message="Notifications you send will be listed here." />
        )}

        {state.data && items.length > 0 && (
          <>
            <ul className="adm-sent">
              {items.map((notification) => {
                const level = levelInfo(notification.level);
                const Icon = LEVEL_ICON[notification.level] ?? Info;
                return (
                  <li key={notification.id}>
                    <span className={`icon-chip tone-${level.tone}`} aria-hidden="true">
                      <Icon />
                    </span>
                    <div className="adm-sent-body">
                      <div className="adm-sent-title">{notification.title}</div>
                      <div className="adm-sent-text">{notification.body}</div>
                      <div className="adm-sent-meta">
                        <Badge tone={level.tone}>{level.label}</Badge>
                        <span>
                          {notification.audience === 'ALL' ? <Users aria-hidden="true" /> : <User aria-hidden="true" />}
                          {notification.audience === 'ALL' ? 'Everyone' : notification.recipientEmail || 'One user'}
                        </span>
                        <span>
                          <Eye aria-hidden="true" />
                          {notification.readCount ?? 0} read
                        </span>
                        {notification.link && (
                          <span className="adm-truncate" style={{ maxWidth: 220 }}>
                            <LinkIcon aria-hidden="true" />
                            {notification.link}
                          </span>
                        )}
                        <span title={formatDateTime(notification.createdAt)}>{timeAgo(notification.createdAt, '—')}</span>
                        {notification.createdByEmail && <span>by {notification.createdByEmail}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete notification “${notification.title}”`}
                      onClick={() => { setDeleteError(''); setDeleteTarget(notification); }}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
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
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Send this to every user?"
        message={`“${form.title.trim()}” will appear in the notification bell of every account.`}
        confirmLabel="Send to everyone"
        busy={sending}
        onConfirm={send}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this notification?"
        message={deleteTarget ? `“${deleteTarget.title}” will be removed from everyone's notification list.` : ''}
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        error={deleteError}
        onConfirm={runDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
