/**
 * Role helpers over the decoded access-token claims (AuthContext `user`).
 *
 * UI ONLY. These decide whether to SHOW admin entry points and whether the
 * /admin routes render; they are not a security boundary. The backend enforces
 * `hasRole('ADMIN')` on every /api/admin/** call and re-checks the database per
 * request, so a demoted admin gets 403s immediately even while this client
 * still holds a token that says ROLE_ADMIN (the claim is a snapshot from issue
 * time and only changes on the next refresh).
 *
 * Claims (JwtTokenProvider): `id` is the user id, `authorities` is a JSON array
 * of strings — USER → ["ROLE_USER"], ADMIN → ["ROLE_USER", "ROLE_ADMIN"]. A
 * comma-separated string is tolerated too, since the backend parser accepts one.
 */

export const ROLE_ADMIN = 'ROLE_ADMIN';

export function authoritiesOf(user) {
  const value = user?.authorities;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

export function isAdmin(user) {
  return authoritiesOf(user).includes(ROLE_ADMIN);
}

/** True when `userId` is the signed-in user (JWT `id` claim). */
export function isCurrentUser(user, userId) {
  return user?.id != null && userId != null && String(user.id) === String(userId);
}
