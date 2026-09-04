import { PlatformMappingClient } from "@/components/platform-mapping-client"

export const metadata = {
  title: "Platform Mapping | Indirex Router Dashboard",
  description: "Manage OTT platforms and device asset logos stored in Supabase storage.",
}

export default function PlatformMappingPage() {
  return <PlatformMappingClient />
}
