import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UniversalRulesClient } from "@/components/shared/universal-rules-client"

export default async function Page() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect("/login")
  }

  return <UniversalRulesClient />
}
