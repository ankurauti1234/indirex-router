"use client"

import * as React from "react"
import { useTelemetryModeStore, TelemetryMode } from "@/lib/use-telemetry-mode-store"
import { Database, Radio, Watch, Sparkles, RefreshCw } from "lucide-react"

interface TelemetryModeLayoutProps {
  children: React.ReactNode
}

export function TelemetryModeLayout({ children }: TelemetryModeLayoutProps) {
  const { mode, isSwitching, targetMode } = useTelemetryModeStore()

  const displayMode: TelemetryMode = targetMode || mode

  return (
    <div className="relative flex flex-1 flex-col min-w-0 min-h-0 w-full">
      {/* 
        Keying by mode guarantees that all child pages (Explorer, Rules, Reports, Devices, Dashboard) 
        completely unmount and cleanly re-mount fresh with no stale filter state or residual rows.
      */}
      <div key={mode} className="flex flex-1 flex-col min-w-0 w-full">
        {children}
      </div>

      {/* Full-Page High Polish Loading Overlay on Mode Switch */}
      {isSwitching && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
        >
          <div className="flex flex-col items-center max-w-sm w-full mx-4 p-6 rounded-2xl bg-card border border-border shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Animated Mode Icon */}
            <div className="relative flex items-center justify-center size-16 rounded-2xl bg-muted/80 border border-border shadow-inner">
              {displayMode === "wearable" ? (
                <Watch className="size-8 text-emerald-500 animate-pulse" />
              ) : displayMode === "router" ? (
                <Radio className="size-8 text-sky-500 animate-pulse" />
              ) : (
                <Database className="size-8 text-primary animate-pulse" />
              )}
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-primary" />
              </span>
            </div>

            {/* Badge & Mode Description */}
            <div className="space-y-1.5 w-full">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-3" />
                <span>Mode Switch</span>
              </div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {displayMode === "wearable"
                  ? "Switching to Wearable Telemetry"
                  : displayMode === "router"
                  ? "Switching to Router Telemetry"
                  : "Switching to SDK Telemetry"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                {displayMode === "wearable"
                  ? "Synchronizing mic acoustic watermarks, song detection logs & heartbeat nodes..."
                  : displayMode === "router"
                  ? "Synchronizing router hardware sessions, DNS queries & bandwidth records..."
                  : "Synchronizing media playback streams, client logs & application metrics..."}
              </p>
            </div>

            {/* Indeterminate Animated Progress Bar */}
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-indeterminate" />
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-mono">
              <RefreshCw className="size-3 animate-spin text-primary" />
              <span>Re-mounting dataset & schema...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
