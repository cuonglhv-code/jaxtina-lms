import { LoginForm } from './_components/login-form'

export const metadata = {
  title: 'Sign in — Jaxtina EduOS',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { redirectTo } = await searchParams

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Sign in to your Jaxtina EduOS account
        </p>
      </div>

      <LoginForm redirectTo={redirectTo} />
    </>
  )
}
