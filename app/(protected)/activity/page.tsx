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
      title="Activity Timeline"
      description="Track historical changes, state transitions, and connection events in chronological order."
      placeholderText="Chronological state activity timeline graph"
    />
  )
}
