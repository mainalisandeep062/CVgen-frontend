import { useSearchParams, Link } from 'react-router-dom';

/**
 * AuthFailure page - displays the error from the OAuth flow.
 *
 * The backend redirects here with ?error=<message-or-code> when login fails.
 */

export default function AuthFailure() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'Unknown error';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-gray-800 mb-2">Sign In Failed</h1>
        <p className="text-sm text-gray-600 mb-6 break-words">
          {decodeURIComponent(error)}
        </p>

        <Link
          to="/login"
          className="inline-block w-full px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
