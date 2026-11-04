import { create } from "zustand"

export type TelemetryMode = "sdk" | "router" | "wearable"

interface TelemetryModeState {
  mode: TelemetryMode
  isSwitching: boolean
  targetMode: TelemetryMode | null
  setMode: (mode: TelemetryMode) => void
  toggleMode: () => void
}

const STORAGE_KEY = "indirex_telemetry_mode"

export const useTelemetryModeStore = create<TelemetryModeState>((set, get) => {
  // Read initial value from localStorage if available in browser
  const getInitialMode = (): TelemetryMode => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === "router" || saved === "sdk" || saved === "wearable") return saved
      } catch {
        // Fallback
      }
    }
    return "sdk"
  }

  let switchTimer: ReturnType<typeof setTimeout> | null = null

  return {
    mode: getInitialMode(),
    isSwitching: false,
    targetMode: null,
    setMode: (nextMode) => {
      const current = get().mode
      if (current === nextMode) return

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, nextMode)
        } catch {
          // ignore
        }
      }

      if (switchTimer) clearTimeout(switchTimer)

      set({
        mode: nextMode,
        isSwitching: true,
        targetMode: nextMode,
      })

      switchTimer = setTimeout(() => {
        set({ isSwitching: false, targetMode: null })
      }, 420)
    },
    toggleMode: () => {
      const order: TelemetryMode[] = ["sdk", "router", "wearable"]
      const idx = order.indexOf(get().mode)
      const next = order[(idx + 1) % order.length]
      get().setMode(next)
    },
  }
})
