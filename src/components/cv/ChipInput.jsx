import { useId, useState } from 'react';
import { X } from 'lucide-react';

/**
 * ChipInput - a list of strings edited as removable pills.
 *
 * Enter or comma commits what is typed; pasting "a, b, c" adds all three;
 * Backspace on an empty field removes the last chip. Duplicates (case
 * insensitive) are ignored. Whatever is still typed is committed on blur so a
 * user who clicks away does not lose the last skill.
 */
export default function ChipInput({ id, label, values, onChange, placeholder, hint }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const incoming = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!incoming.length) return;
    const seen = new Set(values.map((value) => value.toLowerCase()));
    const next = [...values];
    incoming.forEach((entry) => {
      if (!seen.has(entry.toLowerCase())) {
        seen.add(entry.toLowerCase());
        next.push(entry);
      }
    });
    if (next.length !== values.length) onChange(next);
  };

  const remove = (index) => onChange(values.filter((_, i) => i !== index));

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
      setDraft('');
    } else if (event.key === 'Backspace' && !draft && values.length) {
      remove(values.length - 1);
    }
  };

  const onInput = (event) => {
    const value = event.target.value;
    if (value.includes(',')) {
      add(value);
      setDraft('');
    } else {
      setDraft(value);
    }
  };

  return (
    <div className="form-group">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="chip-input">
        {values.map((value, index) => (
          <span className="chip" key={`${value}-${index}`}>
            {value}
            <button type="button" className="chip-remove" aria-label={`Remove ${value}`} onClick={() => remove(index)}>
              <X aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="chip-input-field"
          value={draft}
          placeholder={values.length ? 'Add another…' : placeholder}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft);
            setDraft('');
          }}
        />
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}
