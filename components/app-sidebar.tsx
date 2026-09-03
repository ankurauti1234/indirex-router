"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Activity,
  History,
  GitFork,
  SlidersHorizontal,
  Router,
  Home,
  Terminal,
  Blocks,
  PanelLeftClose,
  PanelLeft,
  Zap,
  FileBarChart,
  Database,
  ChevronsUpDown,
} from "lucide-react"

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  const sidebarGroups = [
    {
      label: "MONITOR & ANALYSIS",
      items: [
        { title: "Dashboard", icon: Home, url: "/dashboard" },
        { title: "Events Explorer", icon: Database, url: "/events" },
        { title: "Sessions", icon: Activity, url: "/sessions" },
        { title: "Activity Timeline", icon: History, url: "/activity" },
        { title: "Reports", icon: FileBarChart, url: "/reports" },
      ],
    },
    {
      label: "SYSTEM LOGIC",
      items: [
        { title: "Event Mapping", icon: GitFork, url: "/event-mapping" },
        { title: "Rules", icon: SlidersHorizontal, url: "/rules" },
      ],
    },
    {
      label: "INFRASTRUCTURE",
      items: [
        { title: "Devices", icon: Router, url: "/devices" },
        { title: "Households", icon: Home, url: "/households" },
        { title: "Diagnostics & Logs", icon: Terminal, url: "/logs" },
      ],
    },
    {
      label: "CONNECTIONS",
      items: [
        { title: "Integrations", icon: Blocks, url: "/integrations" },
      ],
    },
  ]

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200"
      {...props}
    >
      {/* Atlassian App / Project Header */}
      <SidebarHeader className="h-14 border-b border-sidebar-border flex flex-row items-center px-3 py-2 shrink-0">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 w-full rounded p-1 hover:bg-muted/50 transition-colors group ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          {/* Atlassian Product Badge */}
          <div className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground shrink-0 shadow-2xs">
            <Zap className="size-4 fill-primary-foreground text-primary-foreground" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0 text-left">
              <span className="font-bold text-xs tracking-tight text-foreground truncate leading-snug">
                Indirex Router
              </span>
              <span className="text-[10px] font-medium text-muted-foreground truncate leading-none">
                Telemetry & Control
              </span>
            </div>
          )}

          {!isCollapsed && (
            <ChevronsUpDown className="size-3.5 text-muted-foreground/70 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </Link>
      </SidebarHeader>

      {/* Sidebar Navigation Groups */}
      <SidebarContent className="py-2 px-2 gap-4">
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0 gap-1">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase px-2 py-1 h-6">
                {group.label}
              </SidebarGroupLabel>
            )}

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url === "/dashboard" && pathname === "/")

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className={`relative w-full h-8 justify-start gap-2.5 rounded px-2.5 text-xs transition-all font-medium ${
                          isActive
                            ? "bg-accent text-accent-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-primary before:rounded-r"
                            : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                        render={<Link href={item.url} />}
                      >
                        <item.icon
                          className={`size-4 shrink-0 transition-colors ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover/menu-button:text-foreground"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer with Collapse Toggle */}
      <SidebarFooter className="border-t border-sidebar-border p-2 shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={isCollapsed ? "Expand Sidebar (⌘B)" : "Collapse Sidebar (⌘B)"}
              onClick={toggleSidebar}
              className={`w-full h-8 justify-start gap-2.5 rounded px-2.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium ${
                isCollapsed ? "justify-center px-0" : ""
              }`}
            >
              {isCollapsed ? (
                <PanelLeft className="size-4 shrink-0" />
              ) : (
                <PanelLeftClose className="size-4 shrink-0" />
              )}
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Collapse sidebar</span>
                  <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">
                    ⌘B
                  </kbd>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
