export interface PlatformMappingItem {
  id: string
  name: string
  key: string
  iconUrl: string
  fileName?: string
  category?: string
  domainPatterns?: string[]
  isActive?: boolean
}

export const SUPABASE_STORAGE_URL_PREFIX =
  "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/"

export const INITIAL_PLATFORMS: PlatformMappingItem[] = [
  {
    id: "plat-amazon-prime",
    name: "Amazon Prime Video",
    key: "amazon-prime",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}amazon-prime.jpeg`,
    fileName: "amazon-prime.jpeg",
    category: "OTT",
    domainPatterns: ["primevideo.com", "amazonvideo.com", "pv-cdn.net"],
    isActive: true,
  },
  {
    id: "plat-amazon",
    name: "Amazon",
    key: "amazon",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}amazon.jpeg`,
    fileName: "amazon.jpeg",
    category: "E-Commerce",
    domainPatterns: ["amazon.in", "amazon.com", "ssl-images-amazon.com", "media-amazon.com"],
    isActive: true,
  },
  {
    id: "plat-blinkit",
    name: "Blinkit",
    key: "blinkit",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}blinkit.jpeg`,
    fileName: "blinkit.jpeg",
    category: "Quick Commerce",
    domainPatterns: ["blinkit.com", "grofers.com"],
    isActive: true,
  },
  {
    id: "plat-chatgpt",
    name: "ChatGPT",
    key: "chatgpt",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}chatgpt.jpeg`,
    fileName: "chatgpt.jpeg",
    category: "AI / Productivity",
    domainPatterns: ["chatgpt.com", "openai.com", "oaistatic.com", "oaiusercontent.com"],
    isActive: true,
  },
  {
    id: "plat-facebook",
    name: "Facebook",
    key: "facebook",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}facebook.jpeg`,
    fileName: "facebook.jpeg",
    category: "Social Media",
    domainPatterns: ["facebook.com", "fbcdn.net", "meta.com"],
    isActive: true,
  },
  {
    id: "plat-flipkart",
    name: "Flipkart",
    key: "flipkart",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}flipkart.jpeg`,
    fileName: "flipkart.jpeg",
    category: "E-Commerce",
    domainPatterns: ["flipkart.com", "flixcart.com"],
    isActive: true,
  },
  {
    id: "plat-google",
    name: "Google",
    key: "google",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}google.jpeg`,
    fileName: "google.jpeg",
    category: "Search / Services",
    domainPatterns: ["google.com", "google.co.in", "gstatic.com", "googleapis.com"],
    isActive: true,
  },
  {
    id: "plat-jio",
    name: "JioHotstar",
    key: "jio-hotstar",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}jio-hotstar.jpeg`,
    fileName: "jio-hotstar.jpeg",
    category: "OTT",
    domainPatterns: ["hotstar.com", "jiohotstar.com"],
    isActive: true,
  },
  {
    id: "plat-linkedin",
    name: "LinkedIn",
    key: "linkedin",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}linkedin.jpeg`,
    fileName: "linkedin.jpeg",
    category: "Professional / Social",
    domainPatterns: ["linkedin.com", "licdn.com"],
    isActive: true,
  },
  {
    id: "plat-netflix",
    name: "Netflix",
    key: "netflix",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}netflix.jpeg`,
    fileName: "netflix.jpeg",
    category: "OTT",
    domainPatterns: ["netflix.com", "nflxvideo.net", "nflxext.com"],
    isActive: true,
  },
  {
    id: "plat-paytm",
    name: "Paytm",
    key: "paytm",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}paytm.jpeg`,
    fileName: "paytm.jpeg",
    category: "Fintech / Payments",
    domainPatterns: ["paytm.com", "paytmbank.com"],
    isActive: true,
  },
  {
    id: "plat-phonepe",
    name: "PhonePe",
    key: "phonepe",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}phonepe.jpeg`,
    fileName: "phonepe.jpeg",
    category: "Fintech / Payments",
    domainPatterns: ["phonepe.com"],
    isActive: true,
  },
  {
    id: "plat-whatsapp",
    name: "WhatsApp",
    key: "whatsapp",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}whatsapp.jpeg`,
    fileName: "whatsapp.jpeg",
    category: "Communication",
    domainPatterns: ["whatsapp.com", "whatsapp.net"],
    isActive: true,
  },
  {
    id: "plat-x",
    name: "X (Twitter)",
    key: "x",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}x.jpeg`,
    fileName: "x.jpeg",
    category: "Social Media",
    domainPatterns: ["x.com", "twitter.com", "twimg.com"],
    isActive: true,
  },
  {
    id: "plat-youtube",
    name: "YouTube",
    key: "youtube",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}youtube.jpeg`,
    fileName: "youtube.jpeg",
    category: "OTT",
    domainPatterns: ["youtube.com", "googlevideo.com", "ytimg.com", "youtu.be"],
    isActive: true,
  },
]

let cachedMappings: PlatformMappingItem[] | null = null

export function getCustomPlatformMappings(): PlatformMappingItem[] {
  if (cachedMappings && cachedMappings.length > 0) {
    return cachedMappings
  }
  return INITIAL_PLATFORMS
}

export async function fetchPlatformMappings(): Promise<PlatformMappingItem[]> {
  try {
    const res = await fetch("/api/platform-mappings", { cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        return data.mappings
      }
    }
  } catch (err) {
    console.warn("Could not fetch platform mappings from API, using fallback:", err)
  }

  return getCustomPlatformMappings()
}

export async function savePlatformMappingApi(mapping: Omit<PlatformMappingItem, "id">): Promise<PlatformMappingItem[]> {
  try {
    const res = await fetch("/api/platform-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", mapping }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        return data.mappings
      }
    }
  } catch (err) {
    console.error("Failed to save platform mapping to Supabase DB:", err)
  }

  return fetchPlatformMappings()
}

export async function updatePlatformMappingApi(id: string, mapping: Partial<PlatformMappingItem>): Promise<PlatformMappingItem[]> {
  try {
    const res = await fetch("/api/platform-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, mapping }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        return data.mappings
      }
    }
  } catch (err) {
    console.error("Failed to update platform mapping in Supabase DB:", err)
  }

  return fetchPlatformMappings()
}

export async function deletePlatformMappingApi(id: string): Promise<PlatformMappingItem[]> {
  try {
    const res = await fetch("/api/platform-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        return data.mappings
      }
    }
  } catch (err) {
    console.error("Failed to delete platform mapping in Supabase DB:", err)
  }

  return fetchPlatformMappings()
}

export const saveCustomPlatformMapping = savePlatformMappingApi
export const updatePlatformMapping = updatePlatformMappingApi
export const deletePlatformMapping = deletePlatformMappingApi

export function findPlatformIconUrl(platformName: string): string | null {
  if (!platformName) return null
  const p = platformName.toLowerCase().trim()
  const all = (cachedMappings && cachedMappings.length > 0) ? cachedMappings : INITIAL_PLATFORMS

  // 1. Exact key or name match
  for (const item of all) {
    const itemKey = item.key.toLowerCase().trim()
    const itemName = item.name.toLowerCase().trim()
    if (p === itemKey || p === itemName) {
      return item.iconUrl
    }
  }

  // 2. Domain pattern match
  for (const item of all) {
    if (item.domainPatterns?.some(pattern => p.includes(pattern.toLowerCase()))) {
      return item.iconUrl
    }
  }

  // 3. Substring match
  for (const item of all) {
    const itemKey = item.key.toLowerCase().trim()
    if (p.includes(itemKey) || itemKey.includes(p)) {
      return item.iconUrl
    }
  }

  // 4. File name base match
  for (const item of all) {
    if (item.fileName) {
      const base = item.fileName.replace(/\.[^.]+$/, "").toLowerCase()
      if (p.includes(base) || base.includes(p)) {
        return item.iconUrl
      }
    }
  }

  return null
}

// Auto-sync from DB in browser context
if (typeof window !== "undefined") {
  fetchPlatformMappings().catch(() => {})
}
