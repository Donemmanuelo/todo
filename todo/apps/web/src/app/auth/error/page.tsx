export default function AuthError({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const error = searchParams?.error

  const descriptions: Record<string, string> = {
    OAuthAccountNotLinked:
      'Another account already exists with the same e‑mail address. Sign in with the originally linked provider, or link accounts.',
    Configuration:
      'Auth configuration issue. Verify NEXTAUTH_URL, AUTH/NEXTAUTH_SECRET, and provider env vars.',
    AccessDenied:
      'Access denied. You might be missing required permissions.',
    Verification:
      'The sign in link is no longer valid.',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Authentication Error
          </h1>
          <p className="text-blue-200/70">
            {error ? descriptions[error] || error : 'Something went wrong during authentication.'}
          </p>
        </div>

        <div className="glass rounded-xl p-4 space-y-3">
          <ul className="text-sm text-blue-200/70 list-disc pl-5 space-y-1">
            <li>Ensure you are using http://localhost:3000 in development (not https) unless you configured HTTPS.</li>
            <li>Keycloak client must allow redirect URI: http://localhost:3000/api/auth/callback/keycloak</li>
            <li>If you enabled HTTPS locally, also add https://localhost:3000/api/auth/callback/keycloak and set NEXTAUTH_URL accordingly.</li>
            <li>For OAuthAccountNotLinked in dev, you can enable email-based linking or remove the existing user record.</li>
          </ul>
        </div>

        <div className="text-center">
          <a
            href="/auth/signin"
            className="inline-block rounded-lg px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}