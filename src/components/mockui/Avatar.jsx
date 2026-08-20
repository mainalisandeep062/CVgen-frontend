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
 * Subscribes to `cvgen:avatar-changed` so an upload in the profile modal is
 * reflected in the nav immediately, without either component knowing about the
 * other. A broken remote URL (an expired OAuth image, say) falls back to the
 * initials rather than rendering the browser's torn-image glyph.
 */
export default function Avatar({ user, size = 28, className = '' }) {
  const [src, setSrc] = useState(() => resolveAvatar(user));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSrc(resolveAvatar(user));
      setFailed(false);
    };
    sync();
    window.addEventListener(AVATAR_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AVATAR_CHANGED_EVENT, sync);
  }, [user]);

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
