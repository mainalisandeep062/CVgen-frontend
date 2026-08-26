import { useEffect, useState } from 'react';

import { resolveAvatar, AVATAR_CHANGED_EVENT } from '@/auth/avatarStore';

/** "Sandeep Mainali" → "SM". Falls back to "U" for a nameless session. */
function initials(name) {
  if (!name) return 'U';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  );
}

/**
 * Avatar — the user's picture, or their initials when there is none.
 *
 * The picture is a plain <img src>. That is deliberate: the avatar URL is
 * public, unauthenticated and immutable by design, so it must NOT carry an
 * Authorization header — adding one would turn it into a cross-origin
 * preflight the avatar endpoint does not answer, and the image would simply
 * never load. It also means the browser caches it for free, which is safe
 * precisely because a new picture mints a new URL rather than replacing one.
 *
 * Subscribes to `cvgen:avatar-changed` so a change made in the picker shows up
 * in the nav immediately, without either component knowing about the other. A
 * URL that fails to load falls back to the initials rather than rendering the
 * browser's torn-image glyph.
 */
export default function Avatar({ user, size = 28, className = '' }) {
  const [src, setSrc] = useState(() => resolveAvatar(user));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sync = () => setSrc(resolveAvatar(user));
    sync();
    window.addEventListener(AVATAR_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AVATAR_CHANGED_EVENT, sync);
  }, [user]);

  // A new URL deserves a fresh attempt: the previous one may have failed, but
  // URLs are immutable, so a different URL is a genuinely different image.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const style = {
    width: size,
    height: size,
    fontSize: Math.max(10, Math.round(size * 0.38)),
  };

  return (
    <div className={`avatar ${className}`.trim()} style={style}>
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        initials(user?.name)
      )}
    </div>
  );
}
