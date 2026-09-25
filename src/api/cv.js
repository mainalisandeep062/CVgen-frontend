import api from '@/api/axios';
import { unwrap } from '@/api/response';

/**
 * CV endpoints (CvController + CvTemplateController).
 *
 *   GET    /api/cvs              200 data: { items: CvSummary[], page, size, totalElements, totalPages }
 *   POST   /api/cvs              201 data: CvDetail      409 at the per-user cap (20)
 *   GET    /api/cvs/{id}         200 data: CvDetail      404 missing OR someone else's
 *   PUT    /api/cvs/{id}         200 data: CvDetail      full content replace
 *   PATCH  /api/cvs/{id}/meta    200 data: CvDetail      title / templateKey / locale / status
 *   DELETE /api/cvs/{id}         200 data: null
 *   GET    /api/cvs/{id}/export.pdf          200 application/pdf (attachment)   503 render budget exceeded
 *   POST   /api/cvs/{id}/analysis            200 data: CvAnalysis   body { jobTitle?, jobDescription }
 *   POST   /api/cvs/import                   200 data: { content, detected, sections }  multipart "file"
 *   GET    /api/cvs/import/github/{username} 200 data: GithubRepo[]  404 no such user, 429 rate limited
 *   GET    /api/templates                    200 data: [{ key, name, description, supportedSections,
 *                                                         layout, accentColor, premium, creditCost, unlocked }]
 *   POST   /api/templates/{key}/unlock       200 data: { template, balance }   400 not enough credits
 *
 *   CvAnalysis: { coverage, matched[], missing[], optional[], categories: { skills, keywords, experience },
 *                 warnings: [{ code, passed, message }], suggestions[], counts: { matched, missing, warnings },
 *                 requiredYears, cvYears }
 *   GithubRepo: { name, description, url, homepage, language, stars, pushedAt }
 *
 *   CvSummary: { id, title, templateKey, locale, status, createdAt, updatedAt }
 *   CvDetail:  CvSummary + { content, version }
 *
 * `status` is "DRAFT" | "READY". Timestamps are zone-less LocalDateTime
 * strings - parse them with cv/content toTimestamp(). An unknown templateKey is
 * a 400, so only send keys that came from fetchTemplates().
 *
 * Reads return the unwrapped payload. Mutations whose wording the UI toasts
 * (create, delete) return the raw axios response so the caller can read both
 * `data.data` and the backend's localized `message`.
 */

/** Server-side ceiling on page size. */
export const CV_PAGE_SIZE_MAX = 100;

export const CV_STATUS = {
  DRAFT: 'DRAFT',
  READY: 'READY',
};

export async function listCvs({ page = 0, size = CV_PAGE_SIZE_MAX } = {}) {
  return unwrap(await api.get('/api/cvs', { params: { page, size } }));
}

export async function getCv(id) {
  return unwrap(await api.get(`/api/cvs/${encodeURIComponent(id)}`));
}

/** Omitting `content` makes the server seed its v1 starter document. */
export function createCv({ title, templateKey, locale, content }) {
  return api.post('/api/cvs', { title, templateKey, locale, content });
}

export async function replaceCvContent(id, content) {
  return unwrap(await api.put(`/api/cvs/${encodeURIComponent(id)}`, { content }));
}

/** Only the fields present are changed; omit a field to leave it as is. */
export async function updateCvMeta(id, meta) {
  return unwrap(await api.patch(`/api/cvs/${encodeURIComponent(id)}/meta`, meta));
}

export function deleteCv(id) {
  return api.delete(`/api/cvs/${encodeURIComponent(id)}`);
}

/**
 * Copy a CV. There is no duplicate endpoint, so this is a read followed by a
 * create - same cap, same validation.
 */
export async function duplicateCv(id) {
  const source = await getCv(id);
  return createCv({
    title: `${source.title} (Copy)`.slice(0, 255),
    templateKey: source.templateKey,
    locale: source.locale,
    content: source.content,
  });
}

export async function fetchTemplates() {
  return unwrap(await api.get('/api/templates')) ?? [];
}

/**
 * Download the server-rendered PDF. The response is raw bytes, but an error
 * still arrives as the JSON envelope - as a Blob, because of responseType - so
 * it is parsed back before rethrowing, keeping apiMessage() working for callers.
 *
 * @returns {{ blob: Blob, fileName: string }}
 */
export async function exportCvPdf(id) {
  try {
    const response = await api.get(`/api/cvs/${encodeURIComponent(id)}/export.pdf`, {
      responseType: 'blob',
    });
    return { blob: response.data, fileName: fileNameFrom(response.headers['content-disposition']) };
  } catch (error) {
    const body = error?.response?.data;
    if (body instanceof Blob) {
      try {
        error.response.data = JSON.parse(await body.text());
      } catch {
        // not JSON - leave the blob; apiMessage falls back to its default
      }
    }
    throw error;
  }
}

/** Hand a blob to the browser as a file download. */
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileNameFrom(disposition) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || '');
  return match ? match[1] : 'CV.pdf';
}

export async function analyzeCv(id, { jobTitle, jobDescription }) {
  return unwrap(
    await api.post(`/api/cvs/${encodeURIComponent(id)}/analysis`, {
      jobTitle: jobTitle?.trim() || null,
      jobDescription,
    })
  );
}

/** Read an existing CV file into a draft. Nothing is saved server-side. */
export async function importCvFile(file) {
  const form = new FormData();
  form.append('file', file);
  return unwrap(await api.post('/api/cvs/import', form));
}

export async function listGithubRepos(username) {
  return unwrap(await api.get(`/api/cvs/import/github/${encodeURIComponent(username.trim())}`)) ?? [];
}

export async function unlockTemplate(key) {
  return unwrap(await api.post(`/api/templates/${encodeURIComponent(key)}/unlock`));
}
