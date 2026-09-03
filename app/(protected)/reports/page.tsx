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
      title="Reports"
      description="Generate and export audience measurement metrics, household coverage graphs, and panel reach reports."
      placeholderText="Reports generator and export statistics panel"
    />
  )
}
