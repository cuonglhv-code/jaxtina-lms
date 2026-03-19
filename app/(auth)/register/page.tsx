import { RegisterForm } from './_components/register-form'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center w-full px-4">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <h1 className="font-display text-2xl text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-400 mt-1.5 mb-8">
          Join Jaxtina EduOS to start your IELTS journey
        </p>

        {/* Use the Server Action Form Component */}
        <RegisterForm />

      </div>
    </div>
  )
}
