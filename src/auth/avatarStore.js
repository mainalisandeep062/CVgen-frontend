/**
 * Profile-picture store — INTERIM, browser-local.
 *
 * The backend has no avatar field yet: `GET /api/users/me` returns
 * `{ userId, email, name, createdAt, isEmailVerified, providers }` and the JWT
 * carries no picture claim either. Uploads therefore stay on this device until
 * the R2 bucket exists; at that point `resolveAvatar()` is the single seam to
 * change — swap the localStorage lookup for the server URL and every caller
 * (TopNav, ProfileModal) follows.
 *
 * What is stored is a data URL, not a path: a browser cannot re-read a
 * `<input type=file>` path later, and a blob: URL dies with the tab. To keep
 * that affordable the image is center-cropped and re-encoded to a 256px JPEG
 * before it is written (~15-40 kB), well under the ~5 MB localStorage quota
 * that a raw phone photo would blow on its own.
 *
 * Keying is per user (sub / userId / email) so two accounts on one browser do
 * not inherit each other's picture. Mutations dispatch `cvgen:avatar-changed`
 * so open components re-read without prop drilling — same pattern as the mock
 * credits wallet.
 */

const PREFIX = 'cvgen:avatar:';
export const AVATAR_CHANGED_EVENT = 'cvgen:avatar-changed';

/** Longest edge of the stored image, in px. */
const MAX_EDGE = 256;
/** Reject before decoding — a file this big is a mistake, not an avatar. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Stable per-user storage key. JWT claims and the users/me DTO disagree on the
 * id field name, so accept whichever is present.
 */
function keyFor(user) {
  const id = user?.sub || user?.userId || user?.email;
  return id ? `${PREFIX}${id}` : null;
}

function notify() {
  window.dispatchEvent(new Event(AVATAR_CHANGED_EVENT));
}

/** The locally uploaded picture for this user, or null. */
export function getLocalAvatar(user) {
  const key = keyFor(user);
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    // Private-mode / disabled storage — treat as "no picture", never throw.
    return null;
  }
}

export function setLocalAvatar(user, dataUrl) {
  const key = keyFor(user);
  if (!key) return false;
  try {
    localStorage.setItem(key, dataUrl);
    notify();
    return true;
  } catch {
    return false;
  }
}

export function clearLocalAvatar(user) {
  const key = keyFor(user);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up.
  }
  notify();
}

/**
 * The picture to actually render.
 *
 * Precedence: an explicit local upload beats the identity provider's image,
 * because the upload is a deliberate choice the user made after signing in.
 * The OAuth branch is speculative — Google/GitHub/LinkedIn all publish an
 * avatar URL, but our backend does not forward it into the JWT or the profile
 * DTO yet, so every alias it might arrive under is checked and the whole thing
 * simply yields null until one exists.
 */
export function resolveAvatar(user) {
  return (
    getLocalAvatar(user) ||
    user?.picture ||
    user?.avatarUrl ||
    user?.imageUrl ||
    user?.pictureUrl ||
    null
  );
}

/**
 * Read a picked file into a square, downscaled data URL.
 *
 * Center-crops to a square first so portrait/landscape photos are not squashed
 * by the circular frame, then re-encodes as JPEG — the alpha channel is
 * pointless behind a circle mask and PNG would triple the stored size. A
 * transparent source is flattened onto white rather than onto black.
 *
 * @param {File} file
 * @returns {Promise<string>} data URL
 */
export function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('That file is not an image.'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('Image is too large — pick one under 8 MB.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const edge = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - edge) / 2;
        const sy = (img.naturalHeight - edge) / 2;
        const size = Math.min(edge, MAX_EDGE);

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, edge, edge, 0, 0, size, size);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        reject(new Error('Could not process that image.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };

    img.src = url;
  });
}
