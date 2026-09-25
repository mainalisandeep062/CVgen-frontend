import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Crown, Palette, Pencil, Plus, Trash2 } from 'lucide-react';

import Badge from '@/admin/components/Badge';
import { ConfirmModal, Dialog } from '@/admin/components/Dialog';
import { Field, FormRow, Switch } from '@/admin/components/Field';
import { EmptyState, ErrorState, SkeletonCards } from '@/admin/components/States';
import { showToast } from '@/components/mockui/toast';
import {
  LIMITS,
  createTemplate,
  deleteTemplate,
  listAdminTemplates,
  listTemplateLayouts,
  updateTemplate,
} from '@/api/admin';
import { HTTP, apiMessage, apiStatus, fieldErrors, unwrap } from '@/api/response';
import { usePageTitle } from '@/admin/pageContext';
import { formatNumber, humanizeEnum, pluralise } from '@/admin/format';

const DEFAULT_ACCENT = '#4F46E5';

function emptyForm(layouts) {
  const layout = layouts[0];
  return {
    key: '',
    name: '',
    description: '',
    layout: layout?.key ?? '',
    accentColor: DEFAULT_ACCENT,
    supportedSections: layout?.supportedSections ?? [],
    premium: false,
    creditCost: '0',
    active: true,
    sortOrder: '0',
  };
}

function formFromTemplate(template) {
  return {
    key: template.key,
    name: template.name ?? '',
    description: template.description ?? '',
    layout: template.layout ?? '',
    accentColor: template.accentColor || DEFAULT_ACCENT,
    supportedSections: template.supportedSections ?? [],
    premium: Boolean(template.premium),
    creditCost: String(template.creditCost ?? 0),
    active: template.active !== false,
    sortOrder: String(template.sortOrder ?? 0),
  };
}

/** Full PUT/POST body. `key` is added by the caller on create only. */
function toBody(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    layout: form.layout,
    accentColor: form.accentColor,
    supportedSections: form.supportedSections,
    premium: form.premium,
    creditCost: form.premium ? Number(form.creditCost) : 0,
    active: form.active,
    sortOrder: Number(form.sortOrder),
  };
}

function validate(form, isCreate, layout) {
  const errors = {};
  if (isCreate && !LIMITS.templateKeyPattern.test(form.key)) {
    errors.key = 'Use 2–63 lowercase letters, digits or hyphens, starting with a letter or digit.';
  }
  if (!form.name.trim()) errors.name = 'Name is required.';
  else if (form.name.trim().length > LIMITS.templateName) errors.name = `Keep it under ${LIMITS.templateName} characters.`;
  if (form.description.trim().length > LIMITS.templateDescription) {
    errors.description = `Keep it under ${LIMITS.templateDescription} characters.`;
  }
  if (!layout) errors.layout = 'Pick a layout.';
  if (!LIMITS.accentColorPattern.test(form.accentColor)) errors.accentColor = 'Use a hex colour like #4F46E5.';
  if (form.supportedSections.length === 0) errors.supportedSections = 'Pick at least one section.';
  if (form.premium) {
    const cost = Number(form.creditCost);
    if (!Number.isInteger(cost) || cost < 0 || cost > LIMITS.templateCreditCostMax) {
      errors.creditCost = `Enter a whole number from 0 to ${LIMITS.templateCreditCostMax}.`;
    }
  }
  if (!/^-?\d+$/.test(String(form.sortOrder).trim())) errors.sortOrder = 'Enter a whole number.';
  return errors;
}

/**
 * TemplateForm - create/edit dialog.
 * Sections are limited to what the chosen layout can render; switching layout
 * drops sections the new layout doesn't support. `key` is editable on create
 * only (the backend treats it as immutable).
 */
function TemplateForm({ open, template, layouts, onClose, onSaved }) {
  const isCreate = !template;
  const [form, setForm] = useState(() => (template ? formFromTemplate(template) : emptyForm(layouts)));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const layout = layouts.find((item) => item.key === form.layout);
  const layoutSections = layout?.supportedSections ?? [];

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const changeLayout = (key) => {
    const next = layouts.find((item) => item.key === key);
    setForm((current) => {
      const allowed = next?.supportedSections ?? [];
      const kept = current.supportedSections.filter((section) => allowed.includes(section));
      return { ...current, layout: key, supportedSections: kept.length ? kept : allowed };
    });
  };

  const toggleSection = (section) => {
    setForm((current) => ({
      ...current,
      supportedSections: current.supportedSections.includes(section)
        ? current.supportedSections.filter((item) => item !== section)
        : [...current.supportedSections, section],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(form, isCreate, layout);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const body = toBody(form);
      const response = isCreate
        ? await createTemplate({ key: form.key, ...body })
        : await updateTemplate(template.id, body);
      showToast(apiMessage(response, isCreate ? 'Template created.' : 'Template saved.'));
      onSaved(unwrap(response));
    } catch (error) {
      const server = fieldErrors(error);
      if (Object.keys(server).length) {
        setErrors(server);
      } else if (apiStatus(error) === HTTP.CONFLICT && isCreate) {
        setErrors({ key: apiMessage(error, 'That key is already taken.') });
      } else {
        setErrors({ form: apiMessage(error, 'Could not save the template.') });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title={isCreate ? 'New template' : `Edit “${template.name}”`}
      description="A template is a branded variant of a code-level layout, so every template stays renderable."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="template-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : isCreate ? 'Create template' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="template-form" onSubmit={submit} noValidate>
        <FormRow>
          <Field label="Name" htmlFor="tpl-name" required error={errors.name} counter={`${form.name.length}/${LIMITS.templateName}`}>
            <input id="tpl-name" className="input" value={form.name} maxLength={LIMITS.templateName} onChange={(e) => set('name', e.target.value)} aria-invalid={errors.name ? 'true' : undefined} data-autofocus />
          </Field>
          <Field
            label="Key"
            htmlFor="tpl-key"
            required={isCreate}
            error={errors.key}
            hint={isCreate ? 'Lowercase letters, digits and hyphens, e.g. modern-blue. Cannot be changed later.' : 'Keys are permanent.'}
          >
            <input
              id="tpl-key"
              className="input adm-mono"
              value={form.key}
              disabled={!isCreate}
              maxLength={63}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => set('key', e.target.value.toLowerCase())}
              aria-invalid={errors.key ? 'true' : undefined}
            />
          </Field>
        </FormRow>

        <Field label="Description" htmlFor="tpl-desc" error={errors.description} counter={`${form.description.length}/${LIMITS.templateDescription}`}>
          <textarea id="tpl-desc" className="textarea" rows={2} maxLength={LIMITS.templateDescription} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <FormRow>
          <Field label="Layout" htmlFor="tpl-layout" required error={errors.layout}>
            <select id="tpl-layout" className="input" value={form.layout} onChange={(e) => changeLayout(e.target.value)}>
              {layouts.length === 0 && <option value="">No layouts available</option>}
              {layouts.map((item) => (
                <option key={item.key} value={item.key}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Accent colour" htmlFor="tpl-accent-hex" error={errors.accentColor}>
            <div className="adm-color">
              <input
                type="color"
                aria-label="Pick accent colour"
                value={LIMITS.accentColorPattern.test(form.accentColor) ? form.accentColor : DEFAULT_ACCENT}
                onChange={(e) => set('accentColor', e.target.value.toUpperCase())}
              />
              <input id="tpl-accent-hex" className="input adm-mono" value={form.accentColor} maxLength={7} onChange={(e) => set('accentColor', e.target.value.trim())} aria-invalid={errors.accentColor ? 'true' : undefined} />
            </div>
          </Field>
        </FormRow>

        <Field label="Sections" error={errors.supportedSections} hint={layout ? `Sections the ${layout.name} layout can render.` : undefined}>
          <div className="adm-check-grid">
            {layoutSections.map((section) => {
              const checked = form.supportedSections.includes(section);
              return (
                <label key={section} className={`adm-check${checked ? ' checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSection(section)} />
                  {humanizeEnum(section)}
                </label>
              );
            })}
          </div>
        </Field>

        <div className="adm-form-section">Access</div>
        <FormRow>
          <div>
            <Switch id="tpl-active" checked={form.active} onChange={(value) => set('active', value)} label="Active" description="Inactive templates are hidden from the CV builder." />
            <Switch id="tpl-premium" checked={form.premium} onChange={(value) => set('premium', value)} label="Premium" description="Costs credits to unlock." />
          </div>
          <div>
            {form.premium && (
              <Field label="Credit cost" htmlFor="tpl-cost" required error={errors.creditCost} hint={`0 – ${LIMITS.templateCreditCostMax}`}>
                <input id="tpl-cost" type="number" min={0} max={LIMITS.templateCreditCostMax} step={1} className="input" value={form.creditCost} onChange={(e) => set('creditCost', e.target.value)} aria-invalid={errors.creditCost ? 'true' : undefined} />
              </Field>
            )}
            <Field label="Sort order" htmlFor="tpl-sort" error={errors.sortOrder} hint="Lower numbers show first.">
              <input id="tpl-sort" type="number" step={1} className="input" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} aria-invalid={errors.sortOrder ? 'true' : undefined} />
            </Field>
          </div>
        </FormRow>

        {errors.form && (
          <div className="alert alert-danger" role="alert">
            <AlertTriangle aria-hidden="true" />
            <span>{errors.form}</span>
          </div>
        )}
      </form>
    </Dialog>
  );
}

/**
 * Admin Templates - card grid over `GET /api/admin/templates`, with the layout
 * catalogue from `GET /api/admin/templates/layouts` feeding the form.
 *
 * The active switch on a card sends a full PUT (the endpoint has no PATCH).
 * Delete shows the server's 409 wording ("used by N CVs" / "default template")
 * inside the confirmation instead of a disappearing toast.
 */
export default function Templates() {
  usePageTitle('Templates', 'Branded variants of the CV layouts');
  const [state, setState] = useState({ status: 'loading', templates: [], layouts: [], error: null });
  const [editing, setEditing] = useState(null); // null | 'new' | template
  const [toggling, setToggling] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const [templates, layouts] = await Promise.all([listAdminTemplates(), listTemplateLayouts()]);
      setState({ status: 'ready', templates, layouts, error: null });
    } catch (error) {
      setState({ status: 'error', templates: [], layouts: [], error: apiMessage(error, 'Could not load templates.') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const layoutName = (key) => state.layouts.find((item) => item.key === key)?.name ?? key;

  const toggleActive = async (template) => {
    setToggling(template.id);
    try {
      const response = await updateTemplate(template.id, toBody({ ...formFromTemplate(template), active: !template.active }));
      const saved = unwrap(response);
      setState((current) => ({
        ...current,
        templates: current.templates.map((item) => (item.id === template.id ? { ...item, ...(saved ?? { active: !template.active }) } : item)),
      }));
      showToast(apiMessage(response, template.active ? 'Template deactivated.' : 'Template activated.'));
    } catch (error) {
      showToast(apiMessage(error, 'Could not update the template.'));
    } finally {
      setToggling(null);
    }
  };

  const runDelete = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const response = await deleteTemplate(deleteTarget.id);
      showToast(apiMessage(response, 'Template deleted.'));
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setDeleteError(apiMessage(error, 'Could not delete this template.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  if (state.status === 'error') {
    return (
      <div className="adm-card">
        <ErrorState title="Could not load templates" message={state.error} onRetry={load} />
      </div>
    );
  }

  const loading = state.status === 'loading' && state.templates.length === 0;

  return (
    <>
      <div className="adm-page-actions">
        <span className="adm-page-actions-lead">
          {loading ? 'Loading…' : `${state.templates.length} template${state.templates.length === 1 ? '' : 's'}`}
        </span>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')} disabled={loading || state.layouts.length === 0}>
          <Plus aria-hidden="true" /> New template
        </button>
      </div>

      {loading && (
        <div className="adm-template-grid">
          <SkeletonCards count={3} height={220} />
        </div>
      )}

      {!loading && state.templates.length === 0 && (
        <div className="adm-card">
          <EmptyState
            icon={Palette}
            title="No templates yet"
            message="Create the first branded template for the CV builder."
            action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><Plus aria-hidden="true" /> New template</button>}
          />
        </div>
      )}

      {!loading && state.templates.length > 0 && (
        <div className="adm-template-grid">
          {state.templates.map((template) => {
            const accent = template.accentColor || DEFAULT_ACCENT;
            return (
              <article key={template.id} className={`adm-card adm-template-card${template.active ? '' : ' inactive'}`}>
                <div className="adm-template-swatch" style={{ background: `linear-gradient(135deg, ${accent}33, ${accent}99)` }} aria-hidden="true">
                  <div className="adm-template-swatch-doc">
                    <span className="adm-doc-head" style={{ background: accent }} />
                    <span className="adm-doc-sub" />
                    <span className="adm-doc-rule" style={{ background: accent }} />
                    <span />
                    <span style={{ width: '82%' }} />
                    <span style={{ width: '64%' }} />
                  </div>
                </div>
                <div className="adm-template-body">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="adm-template-name">{template.name}</h2>
                      <div className="adm-mono adm-muted">{template.key}</div>
                    </div>
                    <span className="adm-swatch" style={{ background: accent, width: 18, height: 18, borderRadius: 6 }} title={`Accent ${accent}`} />
                  </div>
                  <div className="adm-badges">
                    <Badge tone="neutral" dot={false}>{layoutName(template.layout)}</Badge>
                    {template.premium ? (
                      <Badge tone="warning" dot={false}><Crown aria-hidden="true" /> {formatNumber(template.creditCost)} credits</Badge>
                    ) : (
                      <Badge tone="success" dot={false}>Free</Badge>
                    )}
                    <Badge tone={template.active ? 'success' : 'neutral'}>{template.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {template.description && <p className="adm-template-desc">{template.description}</p>}
                  <div className="adm-template-stats">
                    <span>{pluralise(template.cvCount, 'CV')}</span>
                    <span>{pluralise((template.supportedSections ?? []).length, 'section')}</span>
                    <span>Order <strong>{template.sortOrder}</strong></span>
                  </div>
                </div>
                <div className="adm-template-foot">
                  <Switch
                    id={`tpl-active-${template.id}`}
                    checked={template.active}
                    onChange={() => toggleActive(template)}
                    disabled={toggling === template.id}
                    label={template.active ? 'Active' : 'Inactive'}
                  />
                  <button type="button" className="icon-btn" aria-label={`Edit ${template.name}`} onClick={() => setEditing(template)}>
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Delete ${template.name}`}
                    onClick={() => {
                      setDeleteError('');
                      setDeleteTarget(template);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <TemplateForm
          open
          template={editing === 'new' ? null : editing}
          layouts={state.layouts}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this template?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Templates that are in use or set as the default can't be deleted. Deactivate them instead.`
            : ''
        }
        confirmLabel="Delete template"
        destructive
        busy={deleteBusy}
        error={deleteError}
        onConfirm={runDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
