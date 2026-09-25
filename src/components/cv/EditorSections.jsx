import { ChevronDown, Plus, Trash2 } from 'lucide-react';

import ChipInput from '@/components/cv/ChipInput';

/**
 * The six numbered, collapsible form sections of the builder. Each receives the
 * editor model plus the updaters Builder owns (`ops`), so the state and the
 * autosave stay in one place:
 *
 *   ops.patch(updates)                 top-level fields (summary)
 *   ops.patchPersonal(key, value)
 *   ops.patchSkills(key, value)
 *   ops.patchItem(list, id, key, value)
 *   ops.addItem(list, blank)
 *   ops.removeItem(list, id)
 */

/**
 * @param tone  done | count | partial | empty - colours the status pill
 */
function SectionCard({ id, num, title, status, tone, open, onToggle, children }) {
  const bodyId = `${id}-body`;
  return (
    <section className={`bs-card${open ? ' is-open' : ''}`} id={id} data-section={id}>
      <button type="button" className="bs-card-head" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className="bs-num">{num}</span>
        <span className="bs-card-title">{title}</span>
        <span className={`bs-pill tone-${tone}`}>
          {tone !== 'empty' && <span className="bs-pill-dot" aria-hidden="true" />}
          {status}
        </span>
        <ChevronDown className={`bs-chevron${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={bodyId} className="bs-card-body">
          {children}
        </div>
      )}
    </section>
  );
}

/** Pill text and tone for the list sections: "2 entries" once there is something in them. */
const listStatus = (items) =>
  items.length
    ? { status: `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`, tone: 'count' }
    : { status: 'Empty', tone: 'empty' };

const singleStatus = (state) =>
  ({
    done: { status: 'Complete', tone: 'done' },
    partial: { status: 'Incomplete', tone: 'partial' },
    empty: { status: 'Empty', tone: 'empty' },
  })[state];

function Field({ label, children, compact, aside }) {
  return (
    <label className={`bs-field${compact ? ' compact' : ''}`}>
      <span className="bs-label">
        {label}
        {aside}
      </span>
      {children}
    </label>
  );
}

/** "Senior Engineer at Leapfrog" - the company picks up the brand colour. */
function ItemHeader({ primary, secondary, placeholder, onDelete, extra }) {
  return (
    <div className="bs-item-head">
      <span className="bs-item-title">
        {primary || placeholder}
        {secondary && (
          <>
            <span className="bs-item-at"> at </span>
            <span className="bs-item-org">{secondary}</span>
          </>
        )}
      </span>
      <div className="bs-item-actions">
        {extra}
        <button type="button" className="bs-icon-btn is-danger" title="Delete" aria-label={`Delete ${primary || placeholder}`} onClick={onDelete}>
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function PersonalSection({ cv, ops, state, open, onToggle }) {
  const p = cv.personal;
  const input = (key, type = 'text', autoComplete) => (
    <input
      type={type}
      className="input"
      value={p[key]}
      autoComplete={autoComplete}
      onChange={(e) => ops.patchPersonal(key, e.target.value)}
    />
  );
  return (
    <SectionCard id="personal" num="01" title="Personal Information" {...singleStatus(state)} open={open} onToggle={onToggle}>
      <div className="bs-grid">
        <Field label="Full Name">{input('fullName', 'text', 'name')}</Field>
        <Field label="Professional Title">{input('title', 'text', 'organization-title')}</Field>
        <Field label="Email">{input('email', 'email', 'email')}</Field>
        <Field label="Phone">{input('phone', 'tel', 'tel')}</Field>
        <Field label="Location">{input('location', 'text', 'address-level2')}</Field>
        <Field label="LinkedIn">{input('linkedin', 'url')}</Field>
      </div>
      <Field label="Website / Portfolio" compact>{input('website', 'url', 'url')}</Field>
    </SectionCard>
  );
}

export function SummarySection({ cv, ops, state, open, onToggle }) {
  return (
    <SectionCard id="summary" num="02" title="Professional Summary" {...singleStatus(state)} open={open} onToggle={onToggle}>
      <label className="sr-only" htmlFor="summary-text">Professional summary</label>
      <textarea
        id="summary-text"
        className="textarea"
        rows="4"
        placeholder="Two or three sentences about what you do and what you are looking for."
        value={cv.summary}
        onChange={(e) => ops.patch({ summary: e.target.value })}
      />
    </SectionCard>
  );
}

export function ExperienceSection({ cv, ops, open, onToggle }) {
  const set = (id, key) => (e) => ops.patchItem('experience', id, key, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  return (
    <SectionCard id="experience" num="03" title="Work Experience" {...listStatus(cv.experience)} open={open} onToggle={onToggle}>
      {cv.experience.map((e) => (
        <div className="bs-item" key={e.id}>
          <ItemHeader primary={e.role} secondary={e.company} placeholder="New role" onDelete={() => ops.removeItem('experience', e.id)} />
          <div className="bs-grid">
            <Field label="Company Name" compact><input type="text" className="input" value={e.company} onChange={set(e.id, 'company')} /></Field>
            <Field label="Job Title" compact><input type="text" className="input" value={e.role} onChange={set(e.id, 'role')} /></Field>
            <Field label="Start Date" compact><input type="month" className="input" value={e.start} onChange={set(e.id, 'start')} /></Field>
            <Field label="End Date" compact><input type="month" className="input" value={e.end} disabled={e.current} onChange={set(e.id, 'end')} /></Field>
          </div>
          <label className="bs-checkbox">
            <input type="checkbox" checked={e.current} onChange={set(e.id, 'current')} />
            I currently work here
          </label>
          <Field
            label="Key Achievements & Impact"
            compact
            aside={<span className="bs-label-hint">One per line · numbers read stronger</span>}
          >
            <textarea className="textarea" rows="4" value={e.description} onChange={set(e.id, 'description')} />
          </Field>
        </div>
      ))}
      <button type="button" className="bs-add" onClick={() => ops.addItem('experience', { company: '', role: '', start: '', end: '', current: false, description: '' })}>
        <Plus aria-hidden="true" /> Add experience
      </button>
    </SectionCard>
  );
}

export function EducationSection({ cv, ops, open, onToggle }) {
  const set = (id, key) => (e) => ops.patchItem('education', id, key, e.target.value);
  return (
    <SectionCard id="education" num="04" title="Education" {...listStatus(cv.education)} open={open} onToggle={onToggle}>
      {cv.education.map((e) => (
        <div className="bs-item" key={e.id}>
          <ItemHeader primary={e.degree} secondary={e.institution} placeholder="New degree" onDelete={() => ops.removeItem('education', e.id)} />
          <div className="bs-grid">
            <Field label="Institution" compact><input type="text" className="input" value={e.institution} onChange={set(e.id, 'institution')} /></Field>
            <Field label="Degree" compact><input type="text" className="input" value={e.degree} onChange={set(e.id, 'degree')} /></Field>
            <Field label="Start Year" compact><input type="number" inputMode="numeric" className="input" value={e.startYear} onChange={set(e.id, 'startYear')} /></Field>
            <Field label="End Year" compact><input type="number" inputMode="numeric" className="input" value={e.endYear} onChange={set(e.id, 'endYear')} /></Field>
          </div>
          <Field label="Achievements" compact>
            <textarea className="textarea" rows="2" value={e.achievements} onChange={set(e.id, 'achievements')} />
          </Field>
        </div>
      ))}
      <button type="button" className="bs-add" onClick={() => ops.addItem('education', { institution: '', degree: '', startYear: '', endYear: '', achievements: '' })}>
        <Plus aria-hidden="true" /> Add education
      </button>
    </SectionCard>
  );
}

export function SkillsSection({ cv, ops, state, open, onToggle }) {
  return (
    <SectionCard id="skills" num="05" title="Skills" {...singleStatus(state)} open={open} onToggle={onToggle}>
      <ChipInput
        label="Technical Skills"
        values={cv.skills.technical}
        onChange={(values) => ops.patchSkills('technical', values)}
        placeholder="Java, React, PostgreSQL…"
        hint="Press Enter or comma to add a skill."
      />
      <ChipInput
        label="Soft Skills"
        values={cv.skills.soft}
        onChange={(values) => ops.patchSkills('soft', values)}
        placeholder="Leadership, Communication…"
      />
      <Field label="Languages" compact>
        <input
          type="text"
          className="input"
          placeholder="English (Fluent), Nepali (Native)…"
          value={cv.skills.languages}
          onChange={(e) => ops.patchSkills('languages', e.target.value)}
        />
      </Field>
    </SectionCard>
  );
}

export function ProjectsSection({ cv, ops, open, onToggle, onImportGithub }) {
  const set = (id, key) => (e) => ops.patchItem('projects', id, key, e.target.value);
  return (
    <SectionCard id="projects" num="06" title="Projects" {...listStatus(cv.projects)} open={open} onToggle={onToggle}>
      {cv.projects.map((pr) => (
        <div className="bs-item" key={pr.id}>
          <ItemHeader
            primary={pr.name}
            placeholder="New project"
            onDelete={() => ops.removeItem('projects', pr.id)}
          />
          <div className="bs-grid">
            <Field label="Project Name" compact><input type="text" className="input" value={pr.name} onChange={set(pr.id, 'name')} /></Field>
            <Field label="Link" compact><input type="url" className="input" value={pr.link} onChange={set(pr.id, 'link')} /></Field>
          </div>
          <Field label="Description" compact>
            <textarea className="textarea" rows="3" value={pr.description} onChange={set(pr.id, 'description')} />
          </Field>
        </div>
      ))}
      <div className="bs-add-row">
        <button type="button" className="bs-add" onClick={() => ops.addItem('projects', { name: '', link: '', description: '' })}>
          <Plus aria-hidden="true" /> Add project
        </button>
        {onImportGithub && (
          <button type="button" className="bs-add" onClick={onImportGithub}>
            <Plus aria-hidden="true" /> Import from GitHub
          </button>
        )}
      </div>
    </SectionCard>
  );
}
