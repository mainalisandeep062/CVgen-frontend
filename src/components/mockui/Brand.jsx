import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

/** Brand — gradient logo mark + wordmark, linking home. Presentational only. */
export default function Brand({ to = '/', onDark = false, compact = false, className = '' }) {
  return (
    <Link
      to={to}
      className={`brand${onDark ? ' brand-on-dark' : ''} ${className}`.trim()}
      aria-label="CVGen home"
    >
      <span className="brand-mark" aria-hidden="true">
        <FileText size={18} strokeWidth={2.25} />
      </span>
      <span className={`brand-name${compact ? ' brand-name-hide-sm' : ''}`}>CVGen</span>
    </Link>
  );
}
