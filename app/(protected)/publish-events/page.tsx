import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PublishEventsClient } from "@/components/publish-events-client"

export default async function PublishEventsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect("/login")
  }

  return <PublishEventsClient />
}
