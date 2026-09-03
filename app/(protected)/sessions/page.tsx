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
      title="Sessions"
      description="View active connection sessions and telemetry streams coming from household router meters."
      placeholderText="Connection sessions list and telemetry stream logs"
    />
  )
}
