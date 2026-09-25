import { ChevronLeft, ChevronRight } from 'lucide-react';

import { formatNumber } from '@/admin/format';

/**
 * Pagination for Spring pages (0-based `page`). Renders nothing for an empty
 * result; shows "21–40 of 132" plus previous/next.
 */
export default function Pagination({ page = 0, size = 20, totalElements = 0, totalPages = 0, onChange, disabled }) {
  if (!totalElements) return null;
  const from = page * size + 1;
  const to = Math.min(totalElements, (page + 1) * size);
  const last = Math.max(0, totalPages - 1);

  return (
    <nav className="adm-pagination" aria-label="Pagination">
      <span className="adm-pagination-info">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(totalElements)}
      </span>
      <div className="adm-pagination-controls">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 0}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
          <span className="adm-hide-xs">Previous</span>
        </button>
        <span className="adm-pagination-page">
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= last}
          aria-label="Next page"
        >
          <span className="adm-hide-xs">Next</span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
