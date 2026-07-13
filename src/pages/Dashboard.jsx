import { useAuth } from '../context/AuthContext';

/**
 * Dashboard page - protected route showing the logged-in user's info.
 *
 * Displays name, email, avatar, and provider from the decoded JWT.
 * imageUrl may be null — falls back to a placeholder avatar.
 */

export default function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    // No server-side logout call — the API is stateless (JWT).
    // Just clear client-side storage and redirect.
    logout();
  };

  // Placeholder avatar SVG for when imageUrl is null
  const placeholderAvatar = (
    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
      <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-6">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {
                  // If image fails to load, show placeholder
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{ display: user?.imageUrl ? 'none' : 'flex' }}>
              {placeholderAvatar}
            </div>
            {/* Hidden placeholder for error fallback */}
            {user?.imageUrl && (
              <div className="hidden">{placeholderAvatar}</div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {user?.name || 'User'}
              </h2>
              <p className="text-sm text-gray-500">{user?.email || ''}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Account Details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Provider</dt>
                <dd className="text-sm text-gray-800 capitalize mt-1">{user?.provider || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">User ID</dt>
                <dd className="text-sm text-gray-800 font-mono mt-1">{user?.id || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Email</dt>
                <dd className="text-sm text-gray-800 mt-1">{user?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Subject</dt>
                <dd className="text-sm text-gray-800 font-mono mt-1 break-all">{user?.sub || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Issued By</dt>
                <dd className="text-sm text-gray-800 mt-1">{user?.iss || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Authorities</dt>
                <dd className="text-sm text-gray-800 mt-1">
                  {user?.authorities?.join(', ') || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
