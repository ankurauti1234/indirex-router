import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageContainer } from "@/components/page-container"

export default async function Page() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect("/login")
  }

  return (
    <PageContainer
      title="Diagnostics & Logs"
      description="Analyze real-time syslog output, debug connection errors, and view telemetry metrics."
      placeholderText="System diagnostics log terminal output"
    />
  )
}
