/**
 * Form helpers for admin forms: labelled field with hint/error, a responsive
 * two-column row, an accessible switch and a chip-style filter group.
 */

export function Field({ label, htmlFor, hint, error, required, counter, children, className = '' }) {
  return (
    <div className={`adm-field ${className}`.trim()}>
      {label && (
        <label className="adm-field-label" htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="adm-required" aria-hidden="true">
              *
            </span>
          )}
          {counter && <span className="adm-field-counter">{counter}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="adm-field-error" id={htmlFor ? `${htmlFor}-error` : undefined} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="adm-field-hint" id={htmlFor ? `${htmlFor}-hint` : undefined}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function FormRow({ children }) {
  return <div className="adm-form-row">{children}</div>;
}

/** Switch — a real button with role="switch"; the label text is always visible. */
export function Switch({ id, checked, onChange, label, description, disabled }) {
  return (
    <div className="adm-switch-row">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        className={`adm-switch${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="adm-switch-thumb" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </button>
      <label htmlFor={id} className="adm-switch-text">
        <span className="adm-switch-label" aria-hidden="true">
          {label}
        </span>
        {description && <span className="adm-switch-desc">{description}</span>}
      </label>
    </div>
  );
}

/**
 * ChipGroup — single-select filter chips.
 * @param {{ value: string, onChange: (v: string) => void, options: {value: string, label: string}[], label: string }} props
 */
export function ChipGroup({ value, onChange, options, label }) {
  return (
    <div className="adm-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value || 'all'}
          type="button"
          className={`adm-chip${value === option.value ? ' active' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** RangeSelect — segmented day-range picker for analytics. */
export function RangeSelect({ value, onChange, options = [7, 30, 90], disabled }) {
  return (
    <div className="segmented adm-range" role="group" aria-label="Date range">
      {options.map((days) => (
        <button
          key={days}
          type="button"
          className={`segmented-btn${value === days ? ' active' : ''}`}
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          disabled={disabled}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
