import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Coins,
  FileText,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

import StatCard from '@/admin/components/StatCard';
import ChartTooltip from '@/admin/components/ChartTooltip';
import { RangeSelect } from '@/admin/components/Field';
import { EmptyState, ErrorState, SkeletonBlock, SkeletonCards } from '@/admin/components/States';
import { fetchOverview } from '@/api/admin';
import { apiMessage } from '@/api/response';
import { usePageTitle } from '@/admin/pageContext';
import { AXIS_TICK, CHART, CV_STATUS_COLOR, SERIES } from '@/admin/chartTheme';
import { formatDay, formatMoney, formatMoneyCompact, formatNumber, pluralise, timeAgo } from '@/admin/format';
import { cvStatusInfo } from '@/admin/labels';
import { providerLabel } from '@/lib/providers';

const ACTIVITY_ICON = {
  USER_SIGNUP: { Icon: UserPlus, tone: 'success' },
  CV_CREATED: { Icon: FileText, tone: 'info' },
  PURCHASE: { Icon: ShoppingCart, tone: 'primary' },
  ADMIN_ACTION: { Icon: ShieldCheck, tone: 'warning' },
};

/** Keep at most four provider slices; the rest fold into "Other" (no cycled colours). */
function foldProviders(rows) {
  const sorted = [...(rows ?? [])].sort((a, b) => (b.users || 0) - (a.users || 0));
  if (sorted.length <= SERIES.length) return sorted.map((row) => ({ name: providerLabel(row.provider === 'local' ? 'Email & password' : row.provider), value: row.users || 0 }));
  const head = sorted.slice(0, SERIES.length - 1);
  const rest = sorted.slice(SERIES.length - 1).reduce((sum, row) => sum + (row.users || 0), 0);
  return [
    ...head.map((row) => ({ name: providerLabel(row.provider === 'local' ? 'Email & password' : row.provider), value: row.users || 0 })),
    { name: 'Other', value: rest },
  ];
}

function Card({ title, subtitle, action, children }) {
  return (
    <section className="adm-card">
      <div className="adm-card-header">
        <div>
          <h2 className="adm-card-title">{title}</h2>
          {subtitle && <p className="adm-card-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="adm-card-body">{children}</div>
    </section>
  );
}

/**
 * Admin Overview - `GET /api/admin/analytics/overview?days=N`.
 *
 * KPI deltas compare `period.*` with `period.previous*` (the same-length window
 * right before). Charts: signups & CVs per day (area), revenue per day (bar),
 * template usage and CV status as labelled CSS bars, sign-in providers as a
 * donut with a value list next to it (colour is never the only key). A range
 * switch aborts nothing server-side but ignores stale responses, so a slow 90d
 * reply can't overwrite a newer 7d one.
 */
export default function Overview() {
  usePageTitle('Overview', 'How CVGen is doing');
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ status: 'loading', data: current.data, error: null }));
    try {
      const data = await fetchOverview(days);
      if (id === requestId.current) setState({ status: 'ready', data, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState({ status: 'error', data: null, error: apiMessage(error, 'Could not load analytics.') });
      }
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const { status, data, error } = state;
  const periodLabel = `vs previous ${days} days`;

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
          <ErrorState title="Analytics are unavailable" message={error} onRetry={load} />
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {header}
        <div className="adm-stack">
          <div className="adm-kpis">
            <SkeletonCards count={6} />
          </div>
          <div className="adm-grid-2">
            <div className="adm-card adm-skel-card"><SkeletonBlock height={260} /></div>
            <div className="adm-card adm-skel-card"><SkeletonBlock height={260} /></div>
          </div>
        </div>
      </>
    );
  }

  const totals = data.totals ?? {};
  const period = data.period ?? {};
  const currency = data.currency || 'NPR';
  const series = data.series ?? [];
  const templateUsage = [...(data.templateUsage ?? [])].sort((a, b) => (b.cvCount || 0) - (a.cvCount || 0));
  const maxTemplate = Math.max(1, ...templateUsage.map((row) => row.cvCount || 0));
  const providers = foldProviders(data.providerBreakdown);
  const providerTotal = providers.reduce((sum, row) => sum + row.value, 0);
  const cvStatus = data.cvStatus ?? [];
  const cvStatusTotal = cvStatus.reduce((sum, row) => sum + (row.count || 0), 0);
  const signupsTotal = series.reduce((sum, row) => sum + (row.signups || 0), 0);
  const cvsTotal = series.reduce((sum, row) => sum + (row.cvs || 0), 0);
  const activity = data.recentActivity ?? [];

  return (
    <>
      {header}
      <div className="adm-stack">
        <div className="adm-kpis">
          <StatCard
            label="Total users"
            value={formatNumber(totals.users)}
            icon={Users}
            hint={`${formatNumber(totals.verifiedUsers)} verified · ${pluralise(totals.admins, 'admin')}`}
          />
          <StatCard
            label="New users"
            value={formatNumber(period.newUsers)}
            icon={UserPlus}
            tone="success"
            current={period.newUsers}
            previous={period.previousNewUsers}
            periodLabel={periodLabel}
          />
          <StatCard
            label="CVs created"
            value={formatNumber(period.newCvs)}
            icon={FileText}
            tone="info"
            current={period.newCvs}
            previous={period.previousNewCvs}
            periodLabel={periodLabel}
            hint={`${formatNumber(totals.cvs)} total · ${formatNumber(totals.readyCvs)} ready`}
          />
          <StatCard
            label="Revenue"
            value={formatMoney(period.revenueMinor, currency)}
            icon={Wallet}
            current={period.revenueMinor}
            previous={period.previousRevenueMinor}
            periodLabel={periodLabel}
            hint={`${pluralise(period.purchases, 'purchase')} · ${formatMoney(totals.revenueMinor, currency)} all-time`}
          />
          <StatCard
            label="Active users"
            value={formatNumber(period.activeUsers)}
            icon={UserCheck}
            tone="success"
            hint={`Signed in during the last ${days} days · ${formatNumber(totals.suspendedUsers)} suspended`}
          />
          <StatCard
            label="Credits in circulation"
            value={formatNumber(totals.creditsInCirculation)}
            icon={Coins}
            tone="warning"
            hint="Sum of every user's balance"
          />
        </div>

        <div className="adm-grid-2">
          <Card
            title="Signups & CVs"
            subtitle="Per day (UTC)"
            action={
              <div className="adm-legend" aria-label="Legend">
                <span className="adm-legend-item"><span className="adm-swatch" style={{ background: SERIES[0] }} />Signups <strong>{formatNumber(signupsTotal)}</strong></span>
                <span className="adm-legend-item"><span className="adm-swatch" style={{ background: SERIES[1] }} />CVs <strong>{formatNumber(cvsTotal)}</strong></span>
              </div>
            }
          >
            <div className="adm-chart" role="img" aria-label={`Signups and CVs per day over ${days} days: ${signupsTotal} signups, ${cvsTotal} CVs.`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="admSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="admCvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[1]} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={SERIES[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip formatLabel={formatDay} formatValue={(value) => formatNumber(value)} />} cursor={{ stroke: CHART.cursor }} />
                  <Area type="monotone" dataKey="signups" name="Signups" stroke={SERIES[0]} strokeWidth={2} fill="url(#admSignups)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="cvs" name="CVs" stroke={SERIES[1]} strokeWidth={2} fill="url(#admCvs)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Revenue" subtitle={`Completed purchases per day · ${formatMoney(period.revenueMinor, currency)} in range`}>
            <div className="adm-chart" role="img" aria-label={`Revenue per day over ${days} days, ${formatMoney(period.revenueMinor, currency)} in total.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickFormatter={formatMoneyCompact} tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<ChartTooltip formatLabel={formatDay} formatValue={(value) => formatMoney(value, currency)} />} cursor={{ fill: 'rgba(90, 77, 230, 0.06)' }} />
                  <Bar dataKey="revenueMinor" name="Revenue" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="adm-grid-3">
          <Card title="Template usage" subtitle="CVs per template">
            {templateUsage.length === 0 ? (
              <EmptyState compact title="No templates yet" />
            ) : (
              <div className="adm-bars">
                {templateUsage.map((row) => (
                  <div className="adm-bar-row" key={row.key}>
                    <span className="adm-bar-label adm-truncate" title={row.name}>{row.name}</span>
                    <span className="adm-bar-track" aria-hidden="true">
                      <span className="adm-bar-fill" style={{ width: `${((row.cvCount || 0) / maxTemplate) * 100}%`, display: 'block' }} />
                    </span>
                    <span className="adm-bar-value">{formatNumber(row.cvCount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Sign-in methods" subtitle="Users per provider">
            {providerTotal === 0 ? (
              <EmptyState compact title="No users yet" />
            ) : (
              <div className="adm-donut-wrap">
                <div className="adm-chart sm" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={providers} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                        {providers.map((row, index) => (
                          <Cell key={row.name} fill={SERIES[index]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatValue={(value) => formatNumber(value)} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="adm-legend-list">
                  {providers.map((row, index) => (
                    <li key={row.name}>
                      <span className="adm-swatch" style={{ background: SERIES[index] }} aria-hidden="true" />
                      <span className="adm-truncate">{row.name}</span>
                      <span className="value">{formatNumber(row.value)}</span>
                      <span className="pct">{Math.round((row.value / providerTotal) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="CV status" subtitle={pluralise(cvStatusTotal, 'CV')}>
            {cvStatusTotal === 0 ? (
              <EmptyState compact title="No CVs yet" />
            ) : (
              <>
                <div className="adm-stack-track" aria-hidden="true">
                  {cvStatus.map((row) => (
                    <span
                      key={row.status}
                      className="adm-stack-seg"
                      style={{ width: `${((row.count || 0) / cvStatusTotal) * 100}%`, background: CV_STATUS_COLOR[row.status] ?? CHART.axis }}
                    />
                  ))}
                </div>
                <ul className="adm-legend-list">
                  {cvStatus.map((row) => (
                    <li key={row.status}>
                      <span className="adm-swatch" style={{ background: CV_STATUS_COLOR[row.status] ?? CHART.axis }} aria-hidden="true" />
                      <span>{cvStatusInfo(row.status).label}</span>
                      <span className="value">{formatNumber(row.count)}</span>
                      <span className="pct">{Math.round(((row.count || 0) / cvStatusTotal) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <Card title="Recent activity" subtitle="Latest events across CVGen">
          {activity.length === 0 ? (
            <EmptyState compact icon={Activity} title="Nothing has happened yet" />
          ) : (
            <ul className="adm-activity">
              {activity.map((item, index) => {
                const { Icon, tone } = ACTIVITY_ICON[item.type] ?? { Icon: Activity, tone: 'info' };
                return (
                  <li key={`${item.type}-${item.at}-${index}`}>
                    <span className={`icon-chip tone-${tone}`} aria-hidden="true"><Icon /></span>
                    <div className="min-w-0">
                      <div className="adm-activity-title adm-truncate">{item.title}</div>
                      {item.subtitle && <div className="adm-activity-sub adm-truncate">{item.subtitle}</div>}
                    </div>
                    <span className="adm-activity-time">{timeAgo(item.at, '')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
