import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const userData = {
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
  }

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider>
        <AppSidebar user={userData} />
        <SidebarInset className="flex flex-col min-h-svh min-w-0">
          <SiteHeader user={userData} />
          <div className="flex flex-1 flex-col min-w-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

