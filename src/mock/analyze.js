/**
 * MOCK SERVICE — CV ↔ job-description match analysis.
 *
 * The backend has no analysis endpoint yet. Rather than returning hard-coded
 * numbers, this runs a REAL client-side keyword analysis so the page behaves
 * the way the eventual server-side version should.
 *
 * Backend contract this mock is shaped for:
 *   POST /api/analysis/match
 *     body: { cvId, jobDescription, jobTitle? }
 *     200 -> {
 *       coverage, matched[], missing[], optional[],
 *       categories: { skills, keywords, experience },
 *       warnings[], suggestions[]
 *     }
 *
 * The heuristic is intentionally simple and transparent: extract candidate
 * keywords from the JD against a tech vocabulary + capitalized n-grams, then
 * check each against the flattened CV text. It is NOT an NLP model — the UI
 * copy ("keyword coverage, not a gamified score") stays honest.
 */

import { cvToPlainText } from '@/mock/cvStore';

/** Tech/business vocabulary spotted in JDs, longest-first for greedy matching. */
const VOCABULARY = [
  'Spring Boot', 'REST APIs', 'REST API', 'CI/CD', 'Node.js', 'Next.js',
  'Vue.js', 'React Native', 'Machine Learning', 'Data Analysis', 'Cloud Deployment',
  'Microservices', 'System Design', 'Unit Testing', 'Integration Testing',
  'Test Driven Development', 'Agile', 'Scrum', 'Kanban', 'DevOps',
  'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka', 'RabbitMQ',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible',
  'Git', 'GitHub', 'GitLab', 'Jenkins', 'GraphQL', 'gRPC', 'OAuth', 'JWT',
  'HTML', 'CSS', 'Sass', 'Tailwind', 'Redux', 'Webpack', 'Vite',
  'Linux', 'Bash', 'Nginx', 'Firebase', 'Supabase', 'Prisma', 'Django',
  'Flask', 'FastAPI', 'Express', 'Spring', 'Hibernate', 'JPA', 'Maven', 'Gradle',
  'Selenium', 'Cypress', 'Jest', 'Playwright', 'Figma', 'Jira', 'Confluence',
  'Leadership', 'Communication', 'Mentoring', 'Problem Solving', 'Teamwork',
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'who',
  'that', 'this', 'have', 'has', 'from', 'they', 'them', 'their', 'ideal',
  'candidate', 'looking', 'experience', 'strong', 'plus', 'required',
  'requirements', 'responsibilities', 'role', 'team', 'work', 'working',
  'ability', 'skills', 'years', 'year', 'should', 'must', 'etc',
]);

/** Extract candidate keywords from a job description. */
function extractKeywords(jd) {
  const found = new Map(); // canonical -> canonical (dedupe, case-insensitive)
  const lower = jd.toLowerCase();

  // 1. Vocabulary hits (multi-word aware).
  VOCABULARY.forEach((term) => {
    if (lower.includes(term.toLowerCase())) found.set(term.toLowerCase(), term);
  });

  // 2. Capitalized words / acronyms in the JD (e.g. "Stripe", "GRPC").
  const tokens = jd.match(/\b[A-Za-z][A-Za-z.+#/-]{1,}\b/g) || [];
  tokens.forEach((t) => {
    const clean = t.replace(/[.,;:)]+$/, '');
    const key = clean.toLowerCase();
    if (STOP_WORDS.has(key)) return;
    if (found.has(key)) return;
    const isAcronym = /^[A-Z][A-Z0-9/+.-]{1,}$/.test(clean);
    const isCapitalized = /^[A-Z][a-z]/.test(clean) && !/^(The|A|An|We|You|Our|This|That|Strong|Experience)$/.test(clean);
    if (isAcronym && clean.length >= 2) found.set(key, clean);
    else if (isCapitalized && clean.length > 3 && /[A-Z]/.test(clean.slice(1))) found.set(key, clean);
  });

  return [...found.values()];
}

/** Years of experience asked for in the JD, e.g. "3+ years". */
function extractRequiredYears(jd) {
  const m = jd.match(/(\d+)\+?\s*years?/i);
  return m ? Number(m[1]) : null;
}

/** Rough years of experience implied by the CV's work history. */
function cvExperienceYears(cv) {
  let months = 0;
  cv.experience.forEach((e) => {
    if (!e.start) return;
    const start = new Date(`${e.start}-01`);
    const end = e.current || !e.end ? new Date() : new Date(`${e.end}-01`);
    const diff = (end - start) / (1000 * 60 * 60 * 24 * 30.44);
    if (diff > 0) months += diff;
  });
  return Math.round((months / 12) * 10) / 10;
}

/**
 * POST /api/analysis/match — CLIENT-SIDE implementation.
 * @returns the analysis result object described above.
 */
export function analyzeMatch(cv, jobDescription) {
  const cvText = cvToPlainText(cv).toLowerCase();
  const keywords = extractKeywords(jobDescription);

  const matched = [];
  const missing = [];
  keywords.forEach((kw) => {
    const needle = kw.toLowerCase();
    const hit =
      cvText.includes(needle) ||
      cv.skills.technical.some((s) => s.toLowerCase() === needle);
    (hit ? matched : missing).push(kw);
  });

  const total = keywords.length || 1;
  const coverage = Math.round((matched.length / total) * 100);

  // Category scores — deliberately simple, shown as three bars in the UI.
  const jdSkills = keywords.filter((k) =>
    VOCABULARY.map((v) => v.toLowerCase()).includes(k.toLowerCase())
  );
  const skillsHit = jdSkills.filter((k) => matched.includes(k)).length;
  const skillsScore = jdSkills.length
    ? Math.round((skillsHit / jdSkills.length) * 100)
    : coverage;

  const requiredYears = extractRequiredYears(jobDescription);
  const actualYears = cvExperienceYears(cv);
  const experienceScore = requiredYears
    ? Math.min(100, Math.round((actualYears / requiredYears) * 100))
    : Math.min(100, 50 + cv.experience.length * 25);

  // "Nice to have" lines → optional keywords (soft penalty, amber pill).
  const optional = [];
  const jdLower = jobDescription.toLowerCase();
  const plusIdx = jdLower.indexOf('is a plus');
  if (plusIdx > -1) {
    const tail = jobDescription.slice(Math.max(0, plusIdx - 120), plusIdx);
    extractKeywords(tail).forEach((k) => {
      if (missing.includes(k)) {
        optional.push(k);
      }
    });
  }
  const hardMissing = missing.filter((k) => !optional.includes(k));

  const warnings = [];
  if (!cv.skills.technical.length) {
    warnings.push('No explicit skills section — ATS parsers may miss your keywords.');
  }
  if (!cv.summary) {
    warnings.push('Missing professional summary.');
  }
  if (!warnings.length) {
    warnings.push(
      'Your CV uses a single-column layout which is highly ATS-friendly. No structural issues detected.'
    );
  }

  const suggestions = hardMissing.slice(0, 3).map((kw) => {
    if (jdSkills.includes(kw)) return `Add "${kw}" to your Skills section`;
    return `Mention "${kw}" in your Experience or Summary where truthful`;
  });

  return {
    coverage,
    matched,
    missing: hardMissing,
    optional,
    categories: {
      skills: skillsScore,
      keywords: coverage,
      experience: experienceScore,
    },
    warnings,
    suggestions,
    counts: {
      matched: matched.length,
      missing: hardMissing.length,
      warnings: warnings.filter((w) => !w.startsWith('Your CV uses')).length,
    },
  };
}
