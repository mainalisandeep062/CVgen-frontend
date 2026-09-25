import { formatMonth } from '@/cv/content';

/**
 * Classic - the default template (backend key "classic").
 *
 * Single column with ruled section headings. Renders the editor model from
 * cv/content, so it redraws on every keystroke without touching the server.
 * Draws exactly the section types the backend registry lists for this
 * template: SUMMARY, EXPERIENCE, EDUCATION, SKILLS, PROJECTS, LANGUAGES.
 */
/**
 * Several lines become a bullet list, one line stays a paragraph - the same
 * rule the server's classic.html applies, so preview and PDF agree.
 */
function Body({ text }) {
  const lines = (text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length === 1) return <div className="doc-entry-desc">{lines[0]}</div>;
  return (
    <ul className="doc-bullets">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

export default function ClassicTemplate({ cv }) {
  const p = cv.personal;
  const contact = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);
  const { technical, soft, languages } = cv.skills;

  return (
    <div className="doc-frame">
      <div className="doc-header">
        <div className="doc-name">{p.fullName || 'Your Name'}</div>
        <div className="doc-role">{p.title || 'Professional Title'}</div>
        <div className="doc-contact">
          {contact.map((c, i) => (
            <span key={i}>
              {c}
              {i < contact.length - 1 ? ' • ' : ''}
            </span>
          ))}
        </div>
      </div>
      {cv.summary && (
        <div className="doc-section">
          <div className="doc-section-title">Professional Summary</div>
          <div className="doc-entry-desc">{cv.summary}</div>
        </div>
      )}
      {cv.experience.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Experience</div>
          {cv.experience.map((e) => (
            <div className="doc-entry" key={e.id}>
              <div className="doc-entry-header">
                <span className="doc-entry-title">
                  {e.role || 'Role'}, {e.company || 'Company'}
                </span>
                <span className="doc-entry-date">
                  {formatMonth(e.start)} – {e.current ? 'Present' : formatMonth(e.end)}
                </span>
              </div>
              <Body text={e.description} />
            </div>
          ))}
        </div>
      )}
      {cv.education.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Education</div>
          {cv.education.map((e) => (
            <div className="doc-entry" key={e.id}>
              <div className="doc-entry-header">
                <span className="doc-entry-title">
                  {e.degree || 'Degree'}, {e.institution || 'Institution'}
                </span>
                <span className="doc-entry-date">
                  {e.startYear} – {e.endYear}
                </span>
              </div>
              <Body text={e.achievements} />
            </div>
          ))}
        </div>
      )}
      {(technical.length > 0 || soft.length > 0) && (
        <div className="doc-section">
          <div className="doc-section-title">Skills</div>
          <div className="doc-skills">
            {[...technical, ...soft].map((s, i) => (
              <span className="doc-skill" key={i}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {cv.projects.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Projects</div>
          {cv.projects.map((pr) => (
            <div className="doc-entry" key={pr.id}>
              <div className="doc-entry-header">
                <span className="doc-entry-title">{pr.name || 'Project'}</span>
                {pr.link && <span className="doc-entry-date">{pr.link}</span>}
              </div>
              <Body text={pr.description} />
            </div>
          ))}
        </div>
      )}
      {languages.trim() && (
        <div className="doc-section">
          <div className="doc-section-title">Languages</div>
          <div className="doc-entry-desc">{languages}</div>
        </div>
      )}
    </div>
  );
}
