import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Users as UsersIcon } from 'lucide-react';

import Badge from '@/admin/components/Badge';
import Pagination from '@/admin/components/Pagination';
import SearchInput from '@/admin/components/SearchInput';
import UserAvatar from '@/admin/components/UserAvatar';
import { ChipGroup } from '@/admin/components/Field';
import { EmptyState, ErrorState, SkeletonRows } from '@/admin/components/States';
import { ADMIN_PAGE_SIZE, USER_ROLE, USER_STATUS, listUsers } from '@/api/admin';
import { apiMessage } from '@/api/response';
import { usePageTitle } from '@/admin/pageContext';
import { formatDate, formatNumber, timeAgo, formatDateTime } from '@/admin/format';
import { roleInfo, userStatusInfo } from '@/admin/labels';
import { providerLabel } from '@/lib/providers';

const DEFAULT_SORT = 'createdAt,desc';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: USER_ROLE.USER, label: 'Users' },
  { value: USER_ROLE.ADMIN, label: 'Admins' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: USER_STATUS.ACTIVE, label: 'Active' },
  { value: USER_STATUS.SUSPENDED, label: 'Suspended' },
];

/** Sortable header cell; `aria-sort` tells screen readers the current order. */
function SortHeader({ field, label, sort, onSort, className }) {
  const [activeField, direction] = sort.split(',');
  const active = activeField === field;
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className={`adm-sort${active ? ' active' : ''}`} onClick={() => onSort(field)}>
        {label}
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}

/**
 * Admin Users - `GET /api/admin/users` with search, role/status filters,
 * sorting and paging.
 *
 * Filter state lives in the URL (?q=&role=&status=&page=&sort=) so the back
 * button from a user's detail page returns to the same list. Any filter change
 * resets to page 0. The name cell is a real link (keyboard reachable); the
 * whole row is also clickable for mouse users.
 */
export default function Users() {
  usePageTitle('Users', 'Accounts, roles and access');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const role = searchParams.get('role') ?? '';
  const status = searchParams.get('status') ?? '';
  const sort = searchParams.get('sort') ?? DEFAULT_SORT;
  const page = Math.max(0, Number.parseInt(searchParams.get('page') ?? '0', 10) || 0);

  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const requestId = useRef(0);

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) next.delete(key);
            else next.set(key, String(value));
          });
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    try {
      const data = await listUsers({ q: q.trim(), role, status, page, size: ADMIN_PAGE_SIZE, sort });
      if (id === requestId.current) setState({ status: 'ready', data, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState({ status: 'error', data: null, error: apiMessage(error, 'Could not load users.') });
      }
    }
  }, [q, role, status, page, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (field) => {
    const [activeField, direction] = sort.split(',');
    const nextDirection = activeField === field && direction === 'desc' ? 'asc' : 'desc';
    const next = `${field},${nextDirection}`;
    updateParams({ sort: next === DEFAULT_SORT ? '' : next });
  };

  const filtersActive = Boolean(q || role || status);
  const items = state.data?.items ?? [];

  return (
    <section className="adm-card">
      <div className="adm-toolbar">
        <SearchInput
          value={q}
          onChange={(value) => updateParams({ q: value })}
          placeholder="Search name or email"
          label="Search users"
        />
        <ChipGroup label="Filter by role" value={role} options={ROLE_OPTIONS} onChange={(value) => updateParams({ role: value })} />
        <ChipGroup label="Filter by status" value={status} options={STATUS_OPTIONS} onChange={(value) => updateParams({ status: value })} />
      </div>

      {state.status === 'error' && <ErrorState title="Could not load users" message={state.error} onRetry={load} />}

      {state.status !== 'error' && !state.data && <SkeletonRows rows={8} columns={6} />}

      {state.data && items.length === 0 && (
        <EmptyState
          icon={UsersIcon}
          title={filtersActive ? 'No users match these filters' : 'No users yet'}
          message={filtersActive ? 'Try a different search, or clear the filters.' : 'Accounts will appear here as people sign up.'}
          action={
            filtersActive && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => updateParams({ q: '', role: '', status: '' })}>
                Clear filters
              </button>
            )
          }
        />
      )}

      {state.data && items.length > 0 && (
        <>
          <div className="adm-table-wrap" aria-busy={state.status === 'loading'}>
            <table className="adm-table">
              <caption className="sr-only">Users</caption>
              <thead>
                <tr>
                  <SortHeader field="name" label="User" sort={sort} onSort={handleSort} />
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Sign-in</th>
                  <th scope="col" className="num">CVs</th>
                  <SortHeader field="creditBalance" label="Credits" sort={sort} onSort={handleSort} className="num" />
                  <SortHeader field="createdAt" label="Joined" sort={sort} onSort={handleSort} />
                  <SortHeader field="lastLoginAt" label="Last login" sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const roleBadge = roleInfo(row.role);
                  const statusBadge = userStatusInfo(row.status);
                  const methods = [
                    ...(row.hasPassword ? ['Password'] : []),
                    ...(row.providers ?? []).map(providerLabel),
                  ];
                  return (
                    <tr key={row.userId} className="clickable" onClick={() => navigate(`/admin/users/${row.userId}`)}>
                      <td>
                        <div className="adm-user-cell">
                          <UserAvatar name={row.name} email={row.email} src={row.profilePictureUrl} />
                          <div className="min-w-0">
                            <Link to={`/admin/users/${row.userId}`} onClick={(event) => event.stopPropagation()}>
                              {row.name || row.email}
                            </Link>
                            <div className="adm-user-email adm-truncate">
                              {row.email}
                              {!row.emailVerified && ' · unverified'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={roleBadge.tone}>{roleBadge.label}</Badge></td>
                      <td><Badge tone={statusBadge.tone}>{statusBadge.label}</Badge></td>
                      <td>
                        <div className="adm-badges">
                          {methods.length === 0 ? <span className="adm-muted">-</span> : methods.map((method) => (
                            <Badge key={method} tone="neutral" dot={false}>{method}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="num">{formatNumber(row.cvCount)}</td>
                      <td className="num">{formatNumber(row.creditBalance)}</td>
                      <td title={formatDateTime(row.createdAt)}>{formatDate(row.createdAt)}</td>
                      <td title={formatDateTime(row.lastLoginAt)}>{timeAgo(row.lastLoginAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={state.data.page ?? page}
            size={state.data.size ?? ADMIN_PAGE_SIZE}
            totalElements={state.data.totalElements}
            totalPages={state.data.totalPages}
            disabled={state.status === 'loading'}
            onChange={(next) => updateParams({ page: next > 0 ? next : '' })}
          />
        </>
      )}
    </section>
  );
}
