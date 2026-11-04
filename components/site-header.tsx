"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones } from "@/lib/timezones"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
  Search,
  LogOut,
  Zap,
  Globe,
  ChevronDown,
} from "lucide-react"
import { useTelemetryModeStore } from "@/lib/use-telemetry-mode-store"
import { cn } from "@/lib/utils"

export interface SiteHeaderProps {
  user?: {
    name: string
    email: string
    avatar: string
  }
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { selectedTimezone, setSelectedTimezone, getLocalTimezone } = useTimezoneStore()
  const { mode, setMode } = useTelemetryModeStore()
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

  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "AA"

  return (
    <header className="sticky top-0 z-10 flex h-12 w-full shrink-0 items-center border-b border-border bg-card text-card-foreground px-3 select-none transition-colors">
      <div className="flex w-full items-center justify-between gap-4">
        
        {/* Left Section: Mobile Trigger, Logo & App Name, Mode Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Sidebar Trigger */}
          <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent" />

          {/* Logo & Title */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground shrink-0 shadow-2xs font-bold text-xs">
              <Zap className="size-3.5 fill-current" />
            </div>
            <span className="font-bold text-sm text-foreground tracking-tight hidden md:inline">Indirex</span>
          </Link>

          {/* Telemetry Mode Switcher (Modern Text-Only Segmented Control) */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs font-medium ml-2 shadow-2xs">
            <button
              type="button"
              onClick={() => setMode("sdk")}
              className={cn(
                "px-3 py-1 rounded-md transition-all text-xs cursor-pointer select-none",
                mode === "sdk"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
              title="SDK Mode: View application playback events, schemas, and rules"
            >
              SDK
            </button>
            <button
              type="button"
              onClick={() => setMode("router")}
              className={cn(
                "px-3 py-1 rounded-md transition-all text-xs cursor-pointer select-none",
                mode === "router"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
              title="Router Mode: View hardware router telemetry, schemas, and rules"
            >
              Router
            </button>
            <button
              type="button"
              onClick={() => setMode("wearable")}
              className={cn(
                "px-3 py-1 rounded-md transition-all text-xs cursor-pointer select-none",
                mode === "wearable"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
              title="Wearable Mode: View acoustic watermarking, song match and wearable telemetry"
            >
              Wearable
            </button>
          </div>
        </div>

        {/* Right Section: Timezone Selector & Profile */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Timezone Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button
                type="button"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border/80 bg-background hover:bg-accent text-xs font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
                title={`Active Timezone: ${selectedTimezone}`}
              >
                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                <span className="max-w-[130px] sm:max-w-[200px] truncate text-[11px] sm:text-xs text-foreground/90 font-mono">
                  {selectedTimezone}
                </span>
                <ChevronDown className="size-3 text-muted-foreground/70 shrink-0" />
              </button>
            } />
            <DropdownMenuContent align="end" className="w-80 max-h-[380px] overflow-y-auto p-1.5 bg-popover rounded-lg shadow-lg ring-1 ring-foreground/10 border border-border">
              {/* Search box */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border mb-1">
                <Search className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search timezone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
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
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<button className="outline-hidden focus:outline-hidden cursor-pointer ml-1" />}>
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold ring-2 ring-transparent hover:ring-primary/50 transition-all">
                {userInitials}
              </div>
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
