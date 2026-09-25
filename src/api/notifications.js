import api from '@/api/axios';
import { unwrap } from '@/api/response';

/**
 * User-facing notifications (the nav bell).
 *
 *   GET  /api/notifications?page=&size=   200 data: { items: [{ id, title, body, level, link, read, createdAt }],
 *                                                     unreadCount, page, size, totalElements, totalPages }
 *   POST /api/notifications/{id}/read     200 data: null   idempotent; 404 if not visible to me
 *   POST /api/notifications/read-all      200 data: null
 *
 * Visible = addressed to me, or a broadcast created at/after my account was
 * created. Newest first. `level` is INFO | SUCCESS | WARNING | CRITICAL.
 * `link` is null, an in-app path starting with "/", or an "https://" URL - the
 * backend validates that on create, but the bell re-checks before following it.
 */

export async function listMyNotifications({ page = 0, size = 10 } = {}) {
  return unwrap(await api.get('/api/notifications', { params: { page, size } }));
}

export function markNotificationRead(id) {
  return api.post(`/api/notifications/${encodeURIComponent(id)}/read`);
}

export function markAllNotificationsRead() {
  return api.post('/api/notifications/read-all');
}
