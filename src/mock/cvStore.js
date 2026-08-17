/**
 * MOCK SERVICE — stands in for the future backend CV endpoints.
 *
 * The Spring Boot backend currently ships ONLY auth/user controllers
 * (AuthController, LocalAuthController, UserController). There is no CV
 * entity, repository, or REST endpoint yet. This module fakes that layer in
 * the browser so the UI is fully usable today.
 *
 * Data is persisted to localStorage so a reload does not wipe the user's work.
 * NOTHING here talks to the network.
 *
 * Backend contract this mock is shaped for (to be implemented server-side):
 *   GET    /api/cvs           -> listCVs()
 *   GET    /api/cvs/{id}      -> getCV(id)
 *   POST   /api/cvs           -> createCV(partial)
 *   PUT    /api/cvs/{id}      -> updateCV(id, patch)
 *   DELETE /api/cvs/{id}      -> deleteCV(id)
 *   POST   /api/cvs/{id}/duplicate -> duplicateCV(id)
 *
 * When the real endpoints land, delete this file and swap the imports in
 * Dashboard.jsx / Builder.jsx / Scoring.jsx for axios calls — the function
 * signatures already mirror the REST contract above.
 */

const STORAGE_KEY = 'cvgen.mock.cvs.v1';

/** Seed data — shown the first time the app runs, mirrors the mock template. */
const SEED_CVS = [
  {
    id: 'cv-seed-1',
    title: 'Senior Developer CV',
    template: 'Minimal',
    templateTier: 'free',
    status: 'exported', // draft | exported | locked
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
    personal: {
      fullName: 'Sandeep Mainali',
      title: 'Full Stack Developer',
      email: 'sandeep@example.com',
      phone: '+977 98XXXXXXXX',
      location: 'Kathmandu, Nepal',
      linkedin: 'linkedin.com/in/sandeep',
      website: 'github.com/mainalisandeep062',
    },
    summary:
      'Passionate full-stack developer with 3+ years of experience building scalable web applications using React, Spring Boot, and PostgreSQL. Strong focus on clean architecture and ATS-friendly documentation.',
    experience: [
      {
        id: 'exp-1',
        company: 'TechCorp Nepal',
        role: 'Senior Full Stack Developer',
        start: '2024-01',
        end: '',
        current: true,
        description:
          'Led a team of 4 developers in building a microservices-based e-commerce platform. Reduced API latency by 40% through query optimization and caching strategies.',
      },
      {
        id: 'exp-2',
        company: 'StartUp Labs',
        role: 'Full Stack Developer',
        start: '2022-06',
        end: '2023-12',
        current: false,
        description:
          'Developed RESTful APIs using Spring Boot and built responsive React frontends for internal tools used by 200+ employees.',
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'Texas International College',
        degree: 'Bachelor of Science in CSIT',
        startYear: '2021',
        endYear: '2025',
        achievements:
          "Dean's List 2023. Focus on Software Engineering and Database Systems.",
      },
    ],
    skills: {
      technical: [
        'Java',
        'Spring Boot',
        'React',
        'TypeScript',
        'PostgreSQL',
        'Redis',
        'Docker',
        'AWS',
        'Git',
        'REST APIs',
        'Microservices',
      ],
      soft: ['Leadership', 'Communication'],
      languages: 'English (Fluent), Nepali (Native)',
    },
    projects: [
      {
        id: 'proj-1',
        name: 'CVGen — ATS-Friendly CV Builder',
        link: 'github.com/mainalisandeep062/CVgen-frontend',
        description:
          'A full-stack CV builder with ATS scoring, PDF export via Playwright, and local payment integration.',
      },
    ],
  },
  {
    id: 'cv-seed-2',
    title: 'Frontend Engineer',
    template: 'Modern',
    templateTier: 'free',
    status: 'draft',
    updatedAt: Date.now() - 24 * 60 * 60 * 1000,
    personal: {
      fullName: 'Sandeep Mainali',
      title: 'Frontend Engineer',
      email: 'sandeep@example.com',
      phone: '+977 98XXXXXXXX',
      location: 'Kathmandu, Nepal',
      linkedin: 'linkedin.com/in/sandeep',
      website: '',
    },
    summary:
      'Frontend engineer focused on accessible, high-performance React applications.',
    experience: [],
    education: [],
    skills: { technical: ['React', 'TypeScript', 'CSS'], soft: [], languages: '' },
    projects: [],
  },
  {
    id: 'cv-seed-3',
    title: 'Full Stack Role',
    template: 'Professional',
    templateTier: 'premium',
    status: 'locked',
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    personal: {
      fullName: 'Sandeep Mainali',
      title: 'Full Stack Developer',
      email: 'sandeep@example.com',
      phone: '',
      location: 'Kathmandu, Nepal',
      linkedin: '',
      website: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: { technical: [], soft: [], languages: '' },
    projects: [],
  },
];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted payload — fall through to reseed.
  }
  writeAll(SEED_CVS);
  return SEED_CVS;
}

function writeAll(cvs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cvs));
  } catch {
    // Storage full / unavailable — the in-memory caller state still works.
  }
}

function uid() {
  return `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Blank CV used for "New CV" — mirrors the builder's empty section states. */
function blankCV(title = 'Untitled CV') {
  return {
    id: uid(),
    title,
    template: 'Minimal',
    templateTier: 'free',
    status: 'draft',
    updatedAt: Date.now(),
    personal: {
      fullName: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      website: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: { technical: [], soft: [], languages: '' },
    projects: [],
  };
}

/** GET /api/cvs */
export function listCVs() {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** GET /api/cvs/{id} */
export function getCV(id) {
  return readAll().find((cv) => cv.id === id) || null;
}

/** POST /api/cvs */
export function createCV(partial = {}) {
  const cvs = readAll();
  const cv = { ...blankCV(partial.title), ...partial, id: uid(), updatedAt: Date.now() };
  cvs.push(cv);
  writeAll(cvs);
  return cv;
}

/** PUT /api/cvs/{id} */
export function updateCV(id, patch) {
  const cvs = readAll();
  const idx = cvs.findIndex((cv) => cv.id === id);
  if (idx === -1) return null;
  cvs[idx] = { ...cvs[idx], ...patch, id, updatedAt: Date.now() };
  writeAll(cvs);
  return cvs[idx];
}

/** DELETE /api/cvs/{id} */
export function deleteCV(id) {
  writeAll(readAll().filter((cv) => cv.id !== id));
}

/** POST /api/cvs/{id}/duplicate */
export function duplicateCV(id) {
  const source = getCV(id);
  if (!source) return null;
  const copy = {
    ...JSON.parse(JSON.stringify(source)),
    title: `${source.title} (Copy)`,
    status: 'draft',
  };
  return createCV(copy);
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

/** Flatten a CV into plain text — used by the ATS "raw" view and analysis. */
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
