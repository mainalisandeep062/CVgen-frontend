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
 *   GET    /api/templates        200 data: [{ key, name, description, supportedSections }]
 *
 *   CvSummary: { id, title, templateKey, locale, status, createdAt, updatedAt }
 *   CvDetail:  CvSummary + { content, version }
 *
 * `status` is "DRAFT" | "READY". Timestamps are zone-less LocalDateTime
 * strings — parse them with cv/content toTimestamp(). An unknown templateKey is
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
 * Copy a CV. The backend has no duplicate endpoint yet (roadmap Phase 2), so
 * this is a read followed by a create — same cap, same validation.
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
