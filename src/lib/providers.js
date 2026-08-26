/**
 * Display names for the OAuth providers the backend registers.
 *
 * Provider identifiers arrive lowercase ("google", "github", "linkedin") from
 * both `GET /api/users/me` (`providers`) and the profile-picture options
 * payload (`provider`). Anything unrecognised is title-cased rather than
 * dropped, so a provider added on the backend still renders sensibly here
 * before this map catches up.
 */
const PROVIDER_LABELS = {
  google: 'Google',
  github: 'GitHub',
  linkedin: 'LinkedIn',
};

export function providerLabel(provider) {
  if (!provider) return 'Account';
  return (
    PROVIDER_LABELS[provider.toLowerCase()] ||
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}
