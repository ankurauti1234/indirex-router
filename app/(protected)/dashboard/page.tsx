import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard-client'

export const iframeHeight = "800px"

export const description = "Centralized router meter play state telemetry logs dashboard."

export default async function Page() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/login')
  }

  return <DashboardClient />
}
