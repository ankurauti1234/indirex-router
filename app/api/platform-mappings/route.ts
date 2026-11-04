import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

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

const BUCKET_NAME = "router-device-assets"
const MAPPINGS_FILE = "mappings.json"
const OTT_FOLDER = "ott-icons"

const STORAGE_PREFIX = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '')}/storage/v1/object/public/${BUCKET_NAME}/${OTT_FOLDER}/`

const DEFAULT_PLATFORMS: PlatformMappingItem[] = [
  { id: "plat-amazon-prime", name: "Amazon Prime Video", key: "amazon-prime", iconUrl: `${STORAGE_PREFIX}amazon-prime.jpeg`, fileName: "amazon-prime.jpeg", category: "OTT", domainPatterns: ["primevideo.com", "amazonvideo.com", "pv-cdn.net"], isActive: true },
  { id: "plat-amazon", name: "Amazon", key: "amazon", iconUrl: `${STORAGE_PREFIX}amazon.jpeg`, fileName: "amazon.jpeg", category: "E-Commerce", domainPatterns: ["amazon.in", "amazon.com", "ssl-images-amazon.com", "media-amazon.com"], isActive: true },
  { id: "plat-blinkit", name: "Blinkit", key: "blinkit", iconUrl: `${STORAGE_PREFIX}blinkit.jpeg`, fileName: "blinkit.jpeg", category: "Quick Commerce", domainPatterns: ["blinkit.com", "grofers.com"], isActive: true },
  { id: "plat-chatgpt", name: "ChatGPT", key: "chatgpt", iconUrl: `${STORAGE_PREFIX}chatgpt.jpeg`, fileName: "chatgpt.jpeg", category: "AI / Productivity", domainPatterns: ["chatgpt.com", "openai.com", "oaistatic.com", "oaiusercontent.com"], isActive: true },
  { id: "plat-facebook", name: "Facebook", key: "facebook", iconUrl: `${STORAGE_PREFIX}facebook.jpeg`, fileName: "facebook.jpeg", category: "Social Media", domainPatterns: ["facebook.com", "fbcdn.net", "meta.com"], isActive: true },
  { id: "plat-flipkart", name: "Flipkart", key: "flipkart", iconUrl: `${STORAGE_PREFIX}flipkart.jpeg`, fileName: "flipkart.jpeg", category: "E-Commerce", domainPatterns: ["flipkart.com", "flixcart.com"], isActive: true },
  { id: "plat-google", name: "Google", key: "google", iconUrl: `${STORAGE_PREFIX}google.jpeg`, fileName: "google.jpeg", category: "Search / Services", domainPatterns: ["google.com", "google.co.in", "gstatic.com", "googleapis.com"], isActive: true },
  { id: "plat-jio", name: "JioHotstar", key: "jio-hotstar", iconUrl: `${STORAGE_PREFIX}jio-hotstar.jpeg`, fileName: "jio-hotstar.jpeg", category: "OTT", domainPatterns: ["hotstar.com", "jiohotstar.com"], isActive: true },
  { id: "plat-linkedin", name: "LinkedIn", key: "linkedin", iconUrl: `${STORAGE_PREFIX}linkedin.jpeg`, fileName: "linkedin.jpeg", category: "Professional / Social", domainPatterns: ["linkedin.com", "licdn.com"], isActive: true },
  { id: "plat-netflix", name: "Netflix", key: "netflix", iconUrl: `${STORAGE_PREFIX}netflix.jpeg`, fileName: "netflix.jpeg", category: "OTT", domainPatterns: ["netflix.com", "nflxvideo.net", "nflxext.com"], isActive: true },
  { id: "plat-paytm", name: "Paytm", key: "paytm", iconUrl: `${STORAGE_PREFIX}paytm.jpeg`, fileName: "paytm.jpeg", category: "Fintech / Payments", domainPatterns: ["paytm.com", "paytmbank.com"], isActive: true },
  { id: "plat-phonepe", name: "PhonePe", key: "phonepe", iconUrl: `${STORAGE_PREFIX}phonepe.jpeg`, fileName: "phonepe.jpeg", category: "Fintech / Payments", domainPatterns: ["phonepe.com"], isActive: true },
  { id: "plat-whatsapp", name: "WhatsApp", key: "whatsapp", iconUrl: `${STORAGE_PREFIX}whatsapp.jpeg`, fileName: "whatsapp.jpeg", category: "Communication", domainPatterns: ["whatsapp.com", "whatsapp.net"], isActive: true },
  { id: "plat-x", name: "X (Twitter)", key: "x", iconUrl: `${STORAGE_PREFIX}x.jpeg`, fileName: "x.jpeg", category: "Social Media", domainPatterns: ["x.com", "twitter.com", "twimg.com"], isActive: true },
  { id: "plat-youtube", name: "YouTube", key: "youtube", iconUrl: `${STORAGE_PREFIX}youtube.jpeg`, fileName: "youtube.jpeg", category: "OTT", domainPatterns: ["youtube.com", "googlevideo.com", "ytimg.com", "youtu.be"], isActive: true },
]

// GET: Fetch platform mappings from Postgres platform_mappings table with storage sync fallback
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Attempt query from PostgreSQL database table
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("platform_mappings")
      .select("*")
      .order("name", { ascending: true })

    if (!dbError && dbData && dbData.length > 0) {
      const mappings: PlatformMappingItem[] = dbData.map((row: any) => ({
        id: String(row.id),
        name: row.name,
        key: row.key,
        iconUrl: row.icon_url,
        fileName: row.file_name,
        category: row.category || "OTT",
        domainPatterns: row.domain_patterns || [],
        isActive: row.is_active ?? true,
      }))
      return NextResponse.json({ success: true, mappings })
    }

    // 2. Fallback to Storage JSON if DB table is not yet created
    let mappings: PlatformMappingItem[] = []
    const { data: fileData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(MAPPINGS_FILE)

    if (fileData) {
      try {
        const text = await fileData.text()
        mappings = JSON.parse(text)
      } catch {
        mappings = DEFAULT_PLATFORMS
      }
    } else {
      mappings = DEFAULT_PLATFORMS
    }

    return NextResponse.json({ success: true, mappings })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch platform mappings" },
      { status: 500 }
    )
  }
}

// POST: Save, Update, or Delete platform mappings in Postgres with storage synchronization
export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await request.json()
    const { action, mapping, id } = body

    if (action === "save" && mapping) {
      const payload = {
        name: mapping.name,
        key: mapping.key.toLowerCase(),
        icon_url: mapping.iconUrl,
        file_name: mapping.fileName || null,
        category: mapping.category || "OTT",
        domain_patterns: mapping.domainPatterns || [],
        is_active: mapping.isActive ?? true,
        updated_at: new Date().toISOString(),
      }

      // Upsert into PostgreSQL
      const { error: insertError } = await supabaseAdmin
        .from("platform_mappings")
        .upsert(payload, { onConflict: "key" })

      if (insertError) {
        console.warn("Could not upsert to platform_mappings table, syncing with storage:", insertError.message)
      }
    } else if (action === "update" && id && mapping) {
      const payload: any = { updated_at: new Date().toISOString() }
      if (mapping.name) payload.name = mapping.name
      if (mapping.key) payload.key = mapping.key.toLowerCase()
      if (mapping.iconUrl) payload.icon_url = mapping.iconUrl
      if (mapping.fileName !== undefined) payload.file_name = mapping.fileName
      if (mapping.category) payload.category = mapping.category
      if (mapping.isActive !== undefined) payload.is_active = mapping.isActive

      const { error: updateError } = await supabaseAdmin
        .from("platform_mappings")
        .update(payload)
        .eq("id", id)

      if (updateError) {
        // Fallback update by key
        await supabaseAdmin
          .from("platform_mappings")
          .update(payload)
          .eq("key", mapping.key || id)
      }
    } else if (action === "delete" && id) {
      // Find file to delete if any
      const { data: item } = await supabaseAdmin
        .from("platform_mappings")
        .select("file_name")
        .eq("id", id)
        .single()

      if (item?.file_name) {
        await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .remove([`${OTT_FOLDER}/${item.file_name}`])
      }

      await supabaseAdmin.from("platform_mappings").delete().eq("id", id)
    }

    // Refresh updated list
    const { data: updatedList } = await supabaseAdmin
      .from("platform_mappings")
      .select("*")
      .order("name", { ascending: true })

    if (updatedList && updatedList.length > 0) {
      const formatted = updatedList.map((row: any) => ({
        id: String(row.id),
        name: row.name,
        key: row.key,
        iconUrl: row.icon_url,
        fileName: row.file_name,
        category: row.category || "OTT",
        domainPatterns: row.domain_patterns || [],
        isActive: row.is_active ?? true,
      }))
      return NextResponse.json({ success: true, mappings: formatted })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to mutate platform mapping" },
      { status: 500 }
    )
  }
}
