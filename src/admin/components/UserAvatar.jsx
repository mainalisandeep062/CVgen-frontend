import { useState } from 'react';

import { toFileUrl } from '@/config';

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * UserAvatar — someone else's picture (admin tables), or initials.
 * Unlike mockui/Avatar this does not read the signed-in user's avatar store.
 * The URL is public; `toFileUrl` makes a same-origin path absolute.
 */
export default function UserAvatar({ name, email, src, size = 34 }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const url = toFileUrl(src);
  const showImage = url && failedSrc !== url;

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      aria-hidden="true"
    >
      {showImage ? (
        <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailedSrc(url)} />
      ) : (
        initials(name, email)
      )}
    </span>
  );
}
