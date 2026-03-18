import { RegisterForm } from './_components/register-form'

export const metadata = {
  title: 'Create account — Jaxtina EduOS',
}

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Join Jaxtina EduOS to start your IELTS journey
        </p>
      </div>

      <RegisterForm />
    </>
  )
}
