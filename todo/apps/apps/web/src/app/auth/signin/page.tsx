import { redirect } from 'next/navigation'
import { auth, signIn } from '../../../../auth'

export default async function SignIn({
  searchParams,
}: {
  searchParams: { callbackUrl?: string }
}) {
  const session = await auth()
  
  // If user is already authenticated, redirect to home or callback URL
  if (session) {
    redirect(searchParams.callbackUrl || '/')
  }

  const callbackUrl = searchParams.callbackUrl || '/'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Smart To-Do
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-blue-200/70">
            Email-driven task management with intelligent scheduling
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {/* Google OAuth - Primary */}
          <form action={async () => {
            'use server'
            await signIn('google', { 
              callbackUrl: callbackUrl,
              redirect: true 
            })
          }}>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" clipRule="evenodd" />
                </svg>
              </span>
              Continue with Google
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-gray-400">or</span>
            </div>
          </div>

          {/* Keycloak - Secondary */}
          <form action={async () => {
            'use server'
            await signIn('keycloak', { 
              callbackUrl: callbackUrl,
              redirect: true 
            })
          }}>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-600 text-sm font-medium rounded-xl text-gray-300 bg-transparent hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
              Continue with Keycloak
            </button>
          </form>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-500/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-blue-300/70">New to Smart To-Do?</span>
            </div>
          </div>
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-blue-200/70">
              Your account will be created automatically on first sign-in
            </p>
            <p className="text-xs text-gray-400">
              Choose Google for calendar integration or Keycloak for enterprise authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}