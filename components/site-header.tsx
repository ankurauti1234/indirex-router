"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { createClient } from "@/lib/supabase/client"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones } from "@/lib/timezones"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Router,
  Search,
  HelpCircle,
  Compass,
  Bell,
  LogOut,
  Home,
  HomeIcon,
} from "lucide-react"

export interface SiteHeaderProps {
  user?: {
    name: string
    email: string
    avatar: string
  }
}

const routeTitleMap: Record<string, string> = {
  "dashboard": "Dashboard",
  "events": "Events Explorer",
  "sessions": "Sessions",
  "activity": "Activity Timeline",
  "reports": "Reports",
  "event-mapping": "Event Mapping",
  "rules": "Rules",
  "devices": "Devices",
  "households": "Households",
  "logs": "Diagnostics & Logs",
  "integrations": "Integrations",
  "settings": "Settings",
}

function formatSegmentTitle(segment: string): string {
  if (routeTitleMap[segment]) return routeTitleMap[segment]
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const { state } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { selectedTimezone, setSelectedTimezone, getLocalTimezone } = useTimezoneStore()
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const themeOptions = [
    { name: "System", value: "system" },
    { name: "Dark", value: "dark" },
    { name: "Light", value: "light" }
  ]

  const pathSegments = pathname.split('/').filter(Boolean)

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center border-b bg-background px-4">
      <div className="flex w-full items-center justify-between">
        
        {/* Left Section: Mobile Menu Trigger + Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2">
          {/* Mobile Sidebar Trigger */}
          <SidebarTrigger className="md:hidden size-8" />
          
          {/* Desktop Real Dynamic Breadcrumbs */}
          <div className="flex items-center font-normal text-muted-foreground select-none">
            <Breadcrumb>
              <BreadcrumbList className="flex items-center gap-1 text-xs text-muted-foreground font-normal">

                {pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === "dashboard") ? (
                  <React.Fragment>
                    <BreadcrumbSeparator className="text-muted-foreground/30 px-1 font-light">/</BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-foreground py-0.5 px-1">
                        Dashboard
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </React.Fragment>
                ) : (
                  pathSegments.map((segment, index) => {
                    const href = "/" + pathSegments.slice(0, index + 1).join("/")
                    const isLast = index === pathSegments.length - 1
                    const title = formatSegmentTitle(segment)

                    return (
                      <React.Fragment key={href}>
                        <BreadcrumbSeparator className="text-muted-foreground/30 px-1 font-light">/</BreadcrumbSeparator>
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="font-semibold text-foreground py-0.5 px-1">
                              {title}
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink render={<Link href={href} />} className="hover:text-foreground cursor-pointer transition-colors py-0.5 px-1 rounded text-muted-foreground font-normal">
                              {title}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    )
                  })
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Right Section: Feedback, Search, Actions, Profile */}
        <div className="flex items-center gap-3">
          {/* Feedback */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground text-xs font-normal h-8 px-2.5 transition-colors"
          >
            Feedback
          </Button>

          {/* Search Button */}
          <Button
            variant="outline"
            className="relative h-8 w-44 justify-start rounded-md bg-muted/20 hover:bg-muted/40 text-xs text-muted-foreground pr-10 border border-border/80 shadow-xs hidden md:flex"
          >
            <Search className="mr-2 h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[9px] font-medium opacity-100 sm:flex text-muted-foreground/85">
              <span>Ctrl</span>K
            </kbd>
          </Button>

          {/* Help Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors rounded-full"
            title="Help"
          >
            <HelpCircle className="size-4" />
          </Button>

          {/* Advisors/Compass Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors rounded-full"
            title="Advisors"
          >
            <Compass className="size-4" />
          </Button>

          {/* Notifications Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors rounded-full"
            title="Notifications"
          >
            <Bell className="size-4" />
          </Button>

          {/* User Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<button className="outline-hidden focus:outline-hidden" />}>
              <Avatar className="size-7 hover:ring-2 hover:ring-border transition-all cursor-pointer">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name || "User"} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium uppercase">
                  {user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 mt-1.5">
              {/* User Identity Details */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-none">
                      {user?.email || "email@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Theme Settings Selector */}
              <div className="px-3 py-1 text-[11px] text-muted-foreground/80 font-normal select-none">
                Theme
              </div>
              <div className="space-y-0.5">
                {themeOptions.map((option) => {
                  const isActive = mounted && theme === option.value
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className="cursor-pointer pl-8 py-1.5 text-xs text-foreground flex items-center relative rounded-md"
                    >
                      {isActive && (
                        <span className="absolute left-3.5 size-1.5 rounded-full bg-foreground" />
                      )}
                      <span>{option.name}</span>
                    </DropdownMenuItem>
                  )
                })}
              </div>

              <DropdownMenuSeparator />

              {/* Timezone Switcher Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer py-1.5 px-3 flex items-center justify-between rounded-md w-full text-left focus:bg-accent/50 outline-hidden">
                  <div className="flex flex-col">
                    <span className="text-xs text-foreground font-normal">Timezone</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{selectedTimezone}</span>
                  </div>
                </DropdownMenuSubTrigger>
                
                <DropdownMenuSubContent align="start" className="w-80 max-h-[350px] overflow-y-auto p-1.5 bg-popover rounded-lg shadow-lg ring-1 ring-foreground/10 border border-border">
                  {/* Search box */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border mb-1">
                    <Search className="size-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Search timezone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        // Prevent menu keyboard navigation from intercepting typing
                        if (e.key !== "Escape") {
                          e.stopPropagation()
                        }
                      }}
                      className="w-full bg-transparent text-xs text-foreground outline-hidden border-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>

                  {/* Auto detect option */}
                  {(!search || "auto detect".includes(search.toLowerCase())) && (
                    <DropdownMenuItem
                      onClick={() => setSelectedTimezone(`Auto (${getLocalTimezone()})`)}
                      className="cursor-pointer py-1.5 px-2.5 flex items-center justify-between text-xs text-foreground rounded-md focus:bg-accent/50"
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Auto detect</span>
                        <span className="text-[10px] text-muted-foreground">{getLocalTimezone()}</span>
                      </div>
                      {selectedTimezone.startsWith("Auto") && (
                        <span className="text-xs text-foreground font-semibold">✓</span>
                      )}
                    </DropdownMenuItem>
                  )}

                  {/* Standard options */}
                  {timezones
                    .filter((tz) => tz.label.toLowerCase().includes(search.toLowerCase()))
                    .map((tz) => {
                      const isActive = selectedTimezone === tz.label
                      return (
                        <DropdownMenuItem
                          key={tz.value}
                          onClick={() => setSelectedTimezone(tz.label)}
                          className="cursor-pointer py-1.5 px-2.5 flex items-center justify-between text-xs text-foreground rounded-md focus:bg-accent/50"
                        >
                          <span>{tz.label}</span>
                          {isActive && <span className="text-xs text-foreground font-semibold">✓</span>}
                        </DropdownMenuItem>
                      )
                    })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Logout button */}
              <DropdownMenuItem
                className="cursor-pointer py-1.5 px-3 text-xs text-foreground focus:bg-accent/50 focus:text-foreground rounded-md gap-2.5"
                onClick={handleLogout}
              >
                <LogOut className="size-3.5 text-muted-foreground" />
                <span>Log out</span>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  )
}
