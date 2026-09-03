import { create } from 'zustand'

interface TimezoneState {
  selectedTimezone: string
  setSelectedTimezone: (tz: string) => void
  getLocalTimezone: () => string
}

export const useTimezoneStore = create<TimezoneState>((set) => {
  const getLocalTzName = () => {
    try {
      if (typeof window !== 'undefined') {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      }
    } catch {
      // Fallback
    }
    return 'Asia/Kolkata'
  }

  return {
    selectedTimezone: 'Auto (Asia/Kolkata)',
    setSelectedTimezone: (tz) => set({ selectedTimezone: tz }),
    getLocalTimezone: getLocalTzName,
  }
})
