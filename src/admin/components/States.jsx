import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

/** EmptyState - friendly "nothing here" panel with an optional action. */
export function EmptyState({ icon: Icon = Inbox, title, message, action, compact = false }) {
  return (
    <div className={`adm-empty${compact ? ' compact' : ''}`}>
      <span className="adm-empty-icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="adm-empty-title">{title}</div>
      {message && <p className="adm-empty-message">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** ErrorState - load failure with the server's message and a retry button. */
export function ErrorState({ title = 'Could not load this', message, onRetry, compact = false }) {
  return (
    <div className={`adm-empty adm-error${compact ? ' compact' : ''}`} role="alert">
      <span className="adm-empty-icon" aria-hidden="true">
        <AlertCircle />
      </span>
      <div className="adm-empty-title">{title}</div>
      {message && <p className="adm-empty-message">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-outline btn-sm mt-4" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

/** Skeleton bar. */
export function SkeletonBlock({ height = 16, width = '100%', radius, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ height, width, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** Table-shaped loading placeholder (rows of bars). */
export function SkeletonRows({ rows = 6, columns = 5 }) {
  return (
    <div className="adm-skel-rows" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, row) => (
        <div className="adm-skel-row" key={row}>
          {Array.from({ length: columns }).map((__, col) => (
            <SkeletonBlock
              key={col}
              height={col === 0 ? 34 : 12}
              width={col === 0 ? 34 : `${55 + ((row * 7 + col * 13) % 40)}%`}
              radius={col === 0 ? 999 : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grid of card-shaped placeholders. */
export function SkeletonCards({ count = 4, height = 120 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div className="adm-card adm-skel-card" key={index} aria-hidden="true">
          <SkeletonBlock height={12} width="40%" />
          <SkeletonBlock height={height - 60} width="70%" className="mt-3" />
        </div>
      ))}
    </>
  );
}
