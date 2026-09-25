import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ScrollText, Target, User } from 'lucide-react';

import Badge from '@/admin/components/Badge';
import Pagination from '@/admin/components/Pagination';
import { EmptyState, ErrorState, SkeletonRows } from '@/admin/components/States';
import { ADMIN_ACTIONS, ADMIN_PAGE_SIZE, listAuditLogs } from '@/api/admin';
import { apiMessage } from '@/api/response';
import { usePageTitle } from '@/admin/pageContext';
import { formatDateTime, humanizeEnum, timeAgo } from '@/admin/format';
import { auditActionInfo } from '@/admin/labels';

/**
 * Admin Audit log — `GET /api/admin/audit-logs?action=&page=&size=`.
 *
 * A timeline of what admins did: who, what, to which target and when. Entries
 * that carry a `details` object expose it as pretty-printed JSON behind a
 * native <details> toggle, so the raw record is available without cluttering
 * the list. Filtering by action resets to the first page.
 */
export default function AuditLog() {
  usePageTitle('Audit log', 'Every administrative action');

  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    try {
      const data = await listAuditLogs({ action, page, size: ADMIN_PAGE_SIZE });
      setState({ status: 'ready', data, error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error: apiMessage(error, 'Could not load the audit log.') });
    }
  }, [action, page]);

  useEffect(() => {
    load();
  }, [load]);

  const items = state.data?.items ?? [];

  return (
    <section className="adm-card">
      <div className="adm-toolbar">
        <span className="adm-filter-label" id="audit-filter-label">Filter by action</span>
        <select
          className="input adm-select"
          aria-labelledby="audit-filter-label"
          value={action}
          onChange={(event) => {
            setPage(0);
            setAction(event.target.value);
          }}
        >
          <option value="">All actions</option>
          {ADMIN_ACTIONS.map((value) => (
            <option key={value} value={value}>{humanizeEnum(value)}</option>
          ))}
        </select>
        <span className="adm-toolbar-spacer" />
      </div>

      {state.status === 'error' && <ErrorState title="Could not load the audit log" message={state.error} onRetry={load} />}

      {state.status !== 'error' && !state.data && <SkeletonRows rows={6} columns={3} />}

      {state.data && items.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title={action ? 'No entries for this action' : 'No admin actions recorded yet'}
          message={action ? 'Try a different action, or show them all.' : 'Changes made in the admin console are logged here.'}
          action={
            action && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setPage(0); setAction(''); }}>
                Show all actions
              </button>
            )
          }
        />
      )}

      {state.data && items.length > 0 && (
        <>
          <ul className="adm-timeline">
            {items.map((entry) => {
              const info = auditActionInfo(entry.action);
              return (
                <li className="adm-timeline-item" key={entry.id}>
                  <span className={`adm-timeline-dot tone-${info.tone}`} aria-hidden="true" />
                  <div className="adm-timeline-head">
                    <div className="min-w-0">
                      <div className="adm-timeline-summary">{entry.summary || info.label}</div>
                      <div className="adm-timeline-meta">
                        <span>
                          <User aria-hidden="true" />
                          {entry.actorEmail || 'Unknown admin'}
                        </span>
                        {entry.targetType && (
                          <span className="adm-truncate" style={{ maxWidth: 260 }} title={entry.targetId || ''}>
                            <Target aria-hidden="true" />
                            {humanizeEnum(entry.targetType)}
                            {entry.targetType === 'USER' && entry.targetId ? (
                              <>
                                {' · '}
                                <Link to={`/admin/users/${entry.targetId}`} className="text-link">view</Link>
                              </>
                            ) : (
                              entry.targetId && <span className="adm-mono"> · {entry.targetId}</span>
                            )}
                          </span>
                        )}
                        <span title={formatDateTime(entry.createdAt)}>{timeAgo(entry.createdAt, '—')}</span>
                      </div>
                    </div>
                    <Badge tone={info.tone}>{info.label}</Badge>
                  </div>

                  {entry.details && (
                    <details className="adm-details">
                      <summary>
                        <ChevronRight aria-hidden="true" />
                        Show details
                      </summary>
                      <pre className="adm-json">{JSON.stringify(entry.details, null, 2)}</pre>
                    </details>
                  )}
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
  );
}
