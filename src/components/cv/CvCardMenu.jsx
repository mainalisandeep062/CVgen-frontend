import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, MoreHorizontal, Trash2 } from 'lucide-react';

/** Overflow ⋯ menu on a dashboard CV card: Export PDF, Analyze match, Delete. */
export default function CvCardMenu({ cv, disabled, onExport, onDelete }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className="card-menu" ref={root}>
      <button
        type="button"
        className="btn btn-sm btn-ghost btn-icon"
        aria-label={`More actions for ${cv.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      {open && (
        <div className="card-menu-panel" role="menu">
          <button type="button" role="menuitem" className="user-menu-item" onClick={run(onExport)}>
            <Download aria-hidden="true" />
            Export PDF
          </button>
          <Link role="menuitem" className="user-menu-item" to={`/scoring?cv=${encodeURIComponent(cv.id)}`}>
            <BarChart3 aria-hidden="true" />
            Analyze match
          </Link>
          <div className="user-menu-sep" />
          <button type="button" role="menuitem" className="user-menu-item danger" onClick={run(onDelete)}>
            <Trash2 aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
