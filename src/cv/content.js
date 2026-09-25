/**
 * Translation between the backend's CV content document and the editor model.
 *
 * The server stores `content` as a schema-versioned JSON document (see
 * CvContentValidator on the backend):
 *
 *   {
 *     schemaVersion: 1,
 *     basics:   { fullName, headline, email, phone, location, links: [{ label, url }] },
 *     sections: [{ id, type, title, visible, items: [...] }]
 *   }
 *
 * Section order is array order, and `type` decides how a section is drawn.
 * The editor works on a flatter model instead - one field per form section -
 * so every Builder input stays a plain controlled value:
 *
 *   {
 *     personal:   { fullName, title, email, phone, location, linkedin, website },
 *     summary:    string,
 *     experience: [{ id, company, role, start, end, current, description }],
 *     education:  [{ id, institution, degree, startYear, endYear, achievements }],
 *     skills:     { technical: string[], soft: string[], languages: string },
 *     projects:   [{ id, name, link, description }],
 *   }
 *
 * The backend deliberately round-trips section types and keys it does not
 * know, so an older client must not destroy a newer one's data either.
 * `toContent` therefore writes onto the PREVIOUS document: unknown top-level
 * keys, unknown basics keys, unknown sections, section order and unknown item
 * fields all survive a save from this editor.
 */

export const SCHEMA_VERSION = 1;

/** Section `type` values this editor reads and writes. */
export const SECTION = {
  SUMMARY: 'SUMMARY',
  EXPERIENCE: 'EXPERIENCE',
  EDUCATION: 'EDUCATION',
  SKILLS: 'SKILLS',
  PROJECTS: 'PROJECTS',
  LANGUAGES: 'LANGUAGES',
};

const SECTION_TITLES = {
  [SECTION.SUMMARY]: 'Summary',
  [SECTION.EXPERIENCE]: 'Experience',
  [SECTION.EDUCATION]: 'Education',
  [SECTION.SKILLS]: 'Skills',
  [SECTION.PROJECTS]: 'Projects',
  [SECTION.LANGUAGES]: 'Languages',
};

/** Link labels the two dedicated personal-info inputs are stored under. */
const LINK_LABEL = { linkedin: 'LinkedIn', website: 'Website' };

/** Skill group names the two skills inputs are stored under. */
const SKILL_GROUP = { technical: 'Technical', soft: 'Soft' };

export function newId() {
  return crypto.randomUUID();
}

const text = (value) => (typeof value === 'string' ? value : '');
const list = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function findSection(document, type) {
  return list(document?.sections).find((section) => section?.type === type);
}

function sectionItems(document, type) {
  return list(findSection(document, type)?.items).filter(isObject);
}

function linkUrl(links, label) {
  return text(list(links).find((link) => link?.label === label)?.url);
}

function splitList(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Empty editor model - what a brand-new CV looks like before anything is typed. */
export function emptyModel() {
  return toEditorModel(null);
}

/** Backend content document -> editor model. Tolerates missing or partial documents. */
export function toEditorModel(document) {
  const basics = isObject(document?.basics) ? document.basics : {};
  const skillGroups = sectionItems(document, SECTION.SKILLS);
  const keywords = (name) =>
    list(skillGroups.find((group) => group.name === name)?.keywords).filter(
      (keyword) => typeof keyword === 'string'
    );

  return {
    personal: {
      fullName: text(basics.fullName),
      title: text(basics.headline),
      email: text(basics.email),
      phone: text(basics.phone),
      location: text(basics.location),
      linkedin: linkUrl(basics.links, LINK_LABEL.linkedin),
      website: linkUrl(basics.links, LINK_LABEL.website),
    },
    summary: text(sectionItems(document, SECTION.SUMMARY)[0]?.text),
    experience: sectionItems(document, SECTION.EXPERIENCE).map((item) => ({
      id: text(item.id) || newId(),
      company: text(item.company),
      role: text(item.role),
      start: text(item.startDate),
      end: text(item.endDate),
      current: Boolean(item.current),
      description: text(item.description),
    })),
    education: sectionItems(document, SECTION.EDUCATION).map((item) => ({
      id: text(item.id) || newId(),
      institution: text(item.institution),
      degree: text(item.degree),
      startYear: text(item.startDate),
      endYear: text(item.endDate),
      achievements: text(item.description),
    })),
    skills: {
      technical: keywords(SKILL_GROUP.technical),
      soft: keywords(SKILL_GROUP.soft),
      languages: sectionItems(document, SECTION.LANGUAGES)
        .map((item) => text(item.name))
        .filter(Boolean)
        .join(', '),
    },
    projects: sectionItems(document, SECTION.PROJECTS).map((item) => ({
      id: text(item.id) || newId(),
      name: text(item.name),
      link: text(item.url),
      description: text(item.description),
    })),
  };
}

/**
 * Keep whatever the previous item carried beyond the fields this editor owns,
 * matched by id - a newer client's extra item fields are not ours to drop.
 */
function mergeItems(previousItems, nextItems) {
  const byId = new Map(previousItems.map((item) => [item.id, item]));
  return nextItems.map((item) => ({ ...(byId.get(item.id) || {}), ...item }));
}

/** Editor model -> backend content document, written onto `previous`. */
export function toContent(model, previous) {
  const base = isObject(previous) ? structuredClone(previous) : {};
  const previousBasics = isObject(base.basics) ? base.basics : {};
  const p = model.personal;

  // Links other than the two this form edits (a second portfolio, say) survive.
  const ownLabels = Object.values(LINK_LABEL);
  const links = list(previousBasics.links).filter((link) => !ownLabels.includes(link?.label));
  if (p.linkedin.trim()) links.push({ label: LINK_LABEL.linkedin, url: p.linkedin.trim() });
  if (p.website.trim()) links.push({ label: LINK_LABEL.website, url: p.website.trim() });

  const sections = list(base.sections).filter(isObject);
  const previousItems = (type) => list(findSection(base, type)?.items).filter(isObject);

  const writeSection = (type, items) => {
    const existing = sections.find((section) => section.type === type);
    if (existing) {
      existing.items = items;
      return;
    }
    // A section is only added once it has something in it; the starter
    // document's empty EXPERIENCE/EDUCATION shells stay where they are.
    if (items.length === 0) return;
    sections.push({ id: newId(), type, title: SECTION_TITLES[type], visible: true, items });
  };

  const summaryItem = previousItems(SECTION.SUMMARY)[0];
  writeSection(
    SECTION.SUMMARY,
    model.summary.trim() ? [{ ...summaryItem, id: summaryItem?.id || newId(), text: model.summary }] : []
  );

  writeSection(
    SECTION.EXPERIENCE,
    mergeItems(
      previousItems(SECTION.EXPERIENCE),
      model.experience.map((e) => ({
        id: e.id,
        company: e.company,
        role: e.role,
        startDate: e.start,
        endDate: e.current ? '' : e.end,
        current: e.current,
        description: e.description,
      }))
    )
  );

  writeSection(
    SECTION.EDUCATION,
    mergeItems(
      previousItems(SECTION.EDUCATION),
      model.education.map((e) => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree,
        startDate: String(e.startYear ?? ''),
        endDate: String(e.endYear ?? ''),
        description: e.achievements,
      }))
    )
  );

  const skillGroups = previousItems(SECTION.SKILLS);
  const groupId = (name) => skillGroups.find((group) => group.name === name)?.id || newId();
  const otherGroups = skillGroups.filter(
    (group) => !Object.values(SKILL_GROUP).includes(group.name)
  );
  writeSection(SECTION.SKILLS, [
    ...(model.skills.technical.length
      ? [{ id: groupId(SKILL_GROUP.technical), name: SKILL_GROUP.technical, keywords: model.skills.technical }]
      : []),
    ...(model.skills.soft.length
      ? [{ id: groupId(SKILL_GROUP.soft), name: SKILL_GROUP.soft, keywords: model.skills.soft }]
      : []),
    ...otherGroups,
  ]);

  const languageIds = new Map(previousItems(SECTION.LANGUAGES).map((item) => [item.name, item.id]));
  writeSection(
    SECTION.LANGUAGES,
    splitList(model.skills.languages).map((name) => ({ id: languageIds.get(name) || newId(), name }))
  );

  writeSection(
    SECTION.PROJECTS,
    mergeItems(
      previousItems(SECTION.PROJECTS),
      model.projects.map((pr) => ({
        id: pr.id,
        name: pr.name,
        url: pr.link,
        description: pr.description,
      }))
    )
  );

  return {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    basics: {
      ...previousBasics,
      fullName: p.fullName,
      headline: p.title,
      email: p.email,
      phone: p.phone,
      location: p.location,
      links,
    },
    sections,
  };
}

/** "2024-01" -> "Jan 2024". Anything else is shown as typed. */
export function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return m ? `${months[Number(m) - 1] || m} ${y}` : y;
}

/**
 * Backend timestamps are `LocalDateTime` strings with no zone
 * ("2026-09-15T16:16:03.123"), which the browser parses as local time.
 */
export function toTimestamp(localDateTime) {
  const parsed = Date.parse(localDateTime);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/** Human-friendly "modified …" label for dashboard cards. */
export function relativeTime(ts) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Flatten an editor model into plain text - used by the ATS "raw" view and analysis. */
export function cvToPlainText(cv) {
  const lines = [];
  const p = cv.personal;
  if (p.fullName) lines.push(p.fullName.toUpperCase());
  if (p.title) lines.push(p.title);
  const contact = [p.email, p.phone, p.location, p.linkedin, p.website]
    .filter(Boolean)
    .join(' | ');
  if (contact) lines.push(contact);
  if (cv.summary) {
    lines.push('', 'PROFESSIONAL SUMMARY', cv.summary);
  }
  if (cv.experience.length) {
    lines.push('', 'EXPERIENCE');
    cv.experience.forEach((e) => {
      lines.push(e.role, e.company, `${e.start} – ${e.current ? 'Present' : e.end}`, e.description, '');
    });
  }
  if (cv.education.length) {
    lines.push('EDUCATION');
    cv.education.forEach((e) => {
      lines.push(e.degree, e.institution, `${e.startYear} – ${e.endYear}`, '');
    });
  }
  const skills = [...cv.skills.technical, ...cv.skills.soft, cv.skills.languages]
    .filter(Boolean)
    .join(', ');
  if (skills) lines.push('SKILLS', skills, '');
  if (cv.projects.length) {
    lines.push('PROJECTS');
    cv.projects.forEach((pr) => lines.push(pr.name, pr.description, ''));
  }
  return lines.join('\n').trim();
}

/**
 * GitHub repository (GET /api/cvs/import/github/{username}) -> editor project
 * item. The homepage wins over the repo URL when there is one - it is what a
 * reader would want to open - and the language is appended to the description.
 */
export function repoToProject(repo) {
  const description = [text(repo?.description).trim(), repo?.language ? `Built with ${repo.language}.` : '']
    .filter(Boolean)
    .join(' ');
  return {
    id: newId(),
    name: text(repo?.name),
    link: text(repo?.homepage).trim() || text(repo?.url),
    description,
  };
}

/** Append GitHub repositories to an editor model's Projects, skipping names already listed. */
export function appendRepoProjects(model, repos) {
  const existing = new Set(model.projects.map((project) => project.name.trim().toLowerCase()));
  const added = list(repos)
    .filter((repo) => !existing.has(text(repo?.name).trim().toLowerCase()))
    .map(repoToProject);
  return { ...model, projects: [...model.projects, ...added] };
}

/** Section completion flags for the builder sidebar and progress ring. */
export function sectionCompletion(model) {
  return {
    personal: Boolean(model.personal.fullName.trim() && model.personal.email.trim()),
    summary: Boolean(model.summary.trim()),
    experience: model.experience.length > 0,
    education: model.education.length > 0,
    skills: model.skills.technical.length > 0,
    projects: model.projects.length > 0,
  };
}

/**
 * Per-section progress for the builder sidebar: "done" when the section is
 * complete, "partial" when something is typed but not enough to count,
 * "empty" otherwise.
 */
export function sectionStatus(model) {
  const complete = sectionCompletion(model);
  const p = model.personal;
  const started = {
    personal: Object.values(p).some((v) => String(v).trim()),
    summary: Boolean(model.summary.trim()),
    experience: model.experience.length > 0,
    education: model.education.length > 0,
    skills: model.skills.technical.length + model.skills.soft.length > 0 || Boolean(model.skills.languages.trim()),
    projects: model.projects.length > 0,
  };
  const status = {};
  Object.keys(complete).forEach((key) => {
    status[key] = complete[key] ? 'done' : started[key] ? 'partial' : 'empty';
  });
  return status;
}

/**
 * Structural checks an applicant tracking system cares about, computed from
 * the editor model: the share of passed checks is the sidebar's health score.
 * No job description is involved - that is what the match analysis is for.
 */
export function atsHealth(model) {
  const p = model.personal;
  const checks = [
    Boolean(p.fullName.trim()),
    Boolean(p.email.trim()),
    Boolean(p.phone.trim()),
    Boolean(p.title.trim()),
    Boolean(model.summary.trim()),
    model.experience.length > 0,
    model.experience.length > 0 && model.experience.every((e) => e.role.trim() && e.company.trim() && e.start),
    model.experience.some((e) => /\d/.test(e.description)),
    model.education.length > 0,
    model.skills.technical.length >= 3,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

/** Words a reader would see on the page. */
export function wordCount(model) {
  const text = cvToPlainText(model);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}
