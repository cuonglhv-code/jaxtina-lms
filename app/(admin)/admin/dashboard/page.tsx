import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-display text-gray-900">Admin Dashboard</h1>
      <Card padding="md">
        <p className="text-gray-600">Welcome to the administration panel. System statistics and management tools will appear here.</p>
      </Card>
    </div>
  )
}
