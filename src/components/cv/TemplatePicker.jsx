import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Crown, Loader2, Lock } from 'lucide-react';

import Modal from '@/components/mockui/Modal';
import { unlockTemplate } from '@/api/cv';
import { apiMessage, apiStatus, HTTP } from '@/api/response';

import '@/components/cv/cv.css';

/**
 * TemplatePicker - the builder's template dropdown.
 *
 * Lists what GET /api/templates returned. A premium template the user has not
 * unlocked shows a lock and its price; choosing it opens a confirm dialog that
 * calls POST /api/templates/{key}/unlock and, on success, applies it through
 * `onSelect`. `onUnlocked(template)` lets the parent mark it unlocked locally.
 * The nav balance is refreshed via the `cvgen:credits-changed` event TopNav
 * listens for.
 */
const isLocked = (template) => Boolean(template?.premium && !template?.unlocked);

export default function TemplatePicker({ templates, value, onSelect, onUnlocked }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // template awaiting unlock confirmation
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null); // { message, insufficient }
  const root = useRef(null);

  const current = templates.find((t) => t.key === value);

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

  const choose = (template) => {
    setOpen(false);
    if (template.key === value) return;
    if (isLocked(template)) {
      setError(null);
      setPending(template);
      return;
    }
    onSelect(template.key);
  };

  const confirmUnlock = async () => {
    setUnlocking(true);
    setError(null);
    try {
      const result = await unlockTemplate(pending.key);
      window.dispatchEvent(new Event('cvgen:credits-changed'));
      onUnlocked?.({ ...pending, ...(result?.template || {}), unlocked: true });
      onSelect(pending.key);
      setPending(null);
    } catch (err) {
      const insufficient = apiStatus(err) === HTTP.BAD_REQUEST;
      setError({
        insufficient,
        message: apiMessage(err, insufficient ? 'You do not have enough credits.' : 'Could not unlock this template.'),
      });
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <div className="tpl-picker" ref={root}>
        <button
          type="button"
          className="tpl-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Template: ${current?.name ?? value}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="tpl-swatch" style={{ background: current?.accentColor || 'var(--mk-primary)' }} aria-hidden="true" />
          {current?.name ?? value}
          <ChevronDown aria-hidden="true" />
        </button>
        {open && (
          <ul className="tpl-menu" role="listbox" aria-label="Templates">
            {templates.map((template) => {
              const locked = isLocked(template);
              const selected = template.key === value;
              return (
                <li key={template.key} role="option" aria-selected={selected}>
                  <button type="button" className={`tpl-option${selected ? ' selected' : ''}`} onClick={() => choose(template)}>
                    <span className="tpl-swatch" style={{ background: template.accentColor || 'var(--mk-primary)' }} aria-hidden="true" />
                    <span className="tpl-option-text">
                      <span className="tpl-option-name">
                        {template.name}
                        {locked && <Lock className="tpl-lock" aria-label="Locked" />}
                      </span>
                      {template.description && <span className="tpl-option-desc">{template.description}</span>}
                    </span>
                    {selected ? (
                      <Check className="tpl-check" aria-hidden="true" />
                    ) : locked ? (
                      <span className="tpl-price">
                        <Crown aria-hidden="true" />
                        {template.creditCost} credits
                      </span>
                    ) : template.premium ? (
                      <span className="tpl-owned">Unlocked</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={Boolean(pending)}
        onClose={() => !unlocking && setPending(null)}
        title="Unlock premium template"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)} disabled={unlocking}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmUnlock} disabled={unlocking}>
              {unlocking ? <Loader2 className="spin" aria-hidden="true" /> : <Crown aria-hidden="true" />}
              Unlock for {pending?.creditCost} credits
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="icon-chip" aria-hidden="true"><Lock /></span>
          <div>
            <p className="font-semibold">
              Unlock {pending?.name} for {pending?.creditCost} credits?
            </p>
            <p className="text-sm text-muted mt-1">
              Credits are deducted once. The template stays unlocked for all your CVs.
            </p>
          </div>
        </div>
        {error && (
          <div className="alert alert-danger mt-4" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>
              {error.message}
              {error.insufficient && ' Buy credits from the credits button in the top bar.'}
            </span>
          </div>
        )}
      </Modal>
    </>
  );
}
