import { Minus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

import { periodChange } from '@/admin/format';

/**
 * StatCard — KPI tile: label, headline value, optional period-over-period delta.
 *
 * Pass `current`/`previous` (raw numbers) to show a delta; the arrow icon and
 * the signed percentage carry the direction, the green/red tint only repeats
 * it. `previous === 0` with growth shows "New" instead of an infinite percent.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  current,
  previous,
  periodLabel,
  hint,
}) {
  const showDelta = current !== undefined && previous !== undefined;
  const change = showDelta ? periodChange(current, previous) : null;

  let deltaText = '';
  let DeltaIcon = Minus;
  if (change) {
    if (change.direction === 'new') {
      deltaText = 'New';
      DeltaIcon = Sparkles;
    } else if (change.direction === 'flat') {
      deltaText = 'No change';
    } else {
      const pct = Math.abs(change.pct);
      deltaText = `${change.direction === 'up' ? '+' : '−'}${pct >= 100 ? Math.round(pct) : pct.toFixed(1)}%`;
      DeltaIcon = change.direction === 'up' ? TrendingUp : TrendingDown;
    }
  }

  return (
    <div className="adm-card adm-stat">
      <div className="adm-stat-top">
        <span className="adm-stat-label">{label}</span>
        {Icon && (
          <span className={`icon-chip tone-${tone}`} aria-hidden="true">
            <Icon />
          </span>
        )}
      </div>
      <div className="adm-stat-value">{value}</div>
      {change && (
        <div className="adm-stat-foot">
          <span className={`adm-delta ${change.direction}`}>
            <DeltaIcon aria-hidden="true" />
            {deltaText}
          </span>
          {periodLabel && <span className="adm-stat-hint">{periodLabel}</span>}
        </div>
      )}
      {!change && hint && <div className="adm-stat-foot"><span className="adm-stat-hint">{hint}</span></div>}
      {change && hint && <div className="adm-stat-hint mt-1">{hint}</div>}
    </div>
  );
}
