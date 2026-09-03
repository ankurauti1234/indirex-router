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
      title="Integrations"
      description="Connect your audience measurement streams with analytics services, data warehouses, and webhooks."
      placeholderText="Integrations registry and third-party API hook settings"
    />
  )
}
