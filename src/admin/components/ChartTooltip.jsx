/**
 * ChartTooltip - recharts `content` renderer in the admin card style.
 * `formatValue(value, name)` formats each row; `formatLabel(label)` the heading.
 */
export default function ChartTooltip({ active, payload, label, formatValue, formatLabel }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="adm-tooltip">
      {label !== undefined && (
        <div className="adm-tooltip-label">{formatLabel ? formatLabel(label) : label}</div>
      )}
      {payload.map((entry) => (
        <div className="adm-tooltip-row" key={entry.dataKey ?? entry.name}>
          <span className="adm-swatch" style={{ background: entry.color || entry.payload?.fill }} aria-hidden="true" />
          <span className="adm-tooltip-name">{entry.name}</span>
          <span className="adm-tooltip-value">
            {formatValue ? formatValue(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
