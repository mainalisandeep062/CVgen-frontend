import api from '@/api/axios';
import { unwrap } from '@/api/response';

/**
 * Profile of the signed-in user.
 *
 * The endpoint moved: it is `GET /api/users/me`, not the old `GET /api/users`,
 * and it derives the user from the bearer token rather than any path or query
 * parameter. Returns UserResponseDto:
 *
 *   { userId, email, name, createdAt, isEmailVerified, profilePictureUrl,
 *     providers: string[] }
 *
 * `providers` is the list of linked OAuth identities ("google", "github",
 * "linkedin"); it is empty for an account that only has a local password.
 * `createdAt` is an ISO-8601 local date-time string.
 *
 * `profilePictureUrl` is null when the user has no picture — including for a
 * few seconds right after a first-time OAuth signup, because the backend seeds
 * the provider picture asynchronously. Callers render initials and re-read
 * rather than blocking on it (see auth/avatarStore).
 *
 * This is server truth, unlike the JWT claims AuthContext decodes — the token
 * is a snapshot from issue time and carries neither the linked identities nor
 * the email-verified flag.
 */
export async function fetchCurrentUser() {
  const response = await api.get('/api/users/me');
  return unwrap(response);
}
