import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchInput - debounced text filter.
 *
 * Keeps its own draft so typing is instant, and calls `onChange` only after
 * `delay` ms of quiet. If the parent resets `value` (e.g. "clear filters"), the
 * draft follows it.
 */
export default function SearchInput({ value = '', onChange, placeholder = 'Search…', label = 'Search', delay = 350 }) {
  const [draft, setDraft] = useState(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return undefined;
    const timer = setTimeout(() => onChangeRef.current?.(draft), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay]);

  return (
    <div className="adm-search">
      <Search className="adm-search-icon" aria-hidden="true" />
      <input
        type="search"
        className="input"
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
      />
      {draft && (
        <button
          type="button"
          className="icon-btn adm-search-clear"
          aria-label="Clear search"
          onClick={() => {
            setDraft('');
            onChangeRef.current?.('');
          }}
        >
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
