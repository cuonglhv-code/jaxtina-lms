import { LoginForm } from './_components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center w-full px-4">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <h1 className="font-display text-2xl text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-400 mt-1.5 mb-8">
          Sign in to continue your learning journey
        </p>

        {/* Use the Server Action Form Component */}
        <LoginForm />
        
      </div>
    </div>
  )
}
