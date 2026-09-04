import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export interface PlatformMappingItem {
  id: string
  name: string
  key: string
  iconUrl: string
  fileName?: string
}

const BUCKET_NAME = "router-device-assets"
const MAPPINGS_FILE = "mappings.json"
const OTT_FOLDER = "ott-icons"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey)
}

// GET: Read mappings from Supabase storage & sync with bucket files
export async function GET() {
  try {
    const supabaseAdmin = getAdminClient()
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    let mappings: PlatformMappingItem[] = []

    // 1. Download existing mappings.json
    const { data: fileData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(MAPPINGS_FILE)

    if (fileData) {
      const text = await fileData.text()
      try {
        mappings = JSON.parse(text)
      } catch (e) {
        mappings = []
      }
    }

    // 2. Scan files in ott-icons bucket to ensure any uploaded icon file is mapped
    const { data: bucketFiles } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(OTT_FOLDER)

    if (bucketFiles && Array.isArray(bucketFiles)) {
      let updated = false
      for (const file of bucketFiles) {
        if (!file.name || file.name.startsWith(".")) continue
        const fileKey = file.name.replace(/\.[^/.]+$/, "").toLowerCase()
        const iconUrl = `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${OTT_FOLDER}/${file.name}`

        const exists = mappings.some(
          (m) =>
            m.fileName === file.name ||
            m.key.toLowerCase() === fileKey ||
            m.iconUrl === iconUrl
        )

        if (!exists) {
          const formattedName = fileKey
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")

          mappings.push({
            id: `plat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: formattedName,
            key: fileKey,
            iconUrl,
            fileName: file.name,
          })
          updated = true
        }
      }

      if (updated || !fileData) {
        const jsonBuffer = Buffer.from(JSON.stringify(mappings, null, 2))
        await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(MAPPINGS_FILE, jsonBuffer, {
            contentType: "application/json",
            upsert: true,
          })
      }
    }

    return NextResponse.json({ success: true, mappings })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch platform mappings" },
      { status: 500 }
    )
  }
}

// POST: Save, Update, or Delete platform mappings
export async function POST(request: Request) {
  try {
    const supabaseAdmin = getAdminClient()
    const body = await request.json()
    const { action, mapping, id, mappings: fullList } = body

    let currentMappings: PlatformMappingItem[] = []

    if (fullList && Array.isArray(fullList)) {
      currentMappings = fullList
    } else {
      const { data: fileData } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(MAPPINGS_FILE)

      if (fileData) {
        try {
          const text = await fileData.text()
          currentMappings = JSON.parse(text)
        } catch (e) {
          currentMappings = []
        }
      }

      if (action === "save" && mapping) {
        const newItem: PlatformMappingItem = {
          ...mapping,
          id: mapping.id || `plat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        }
        currentMappings.push(newItem)
      } else if (action === "update" && id && mapping) {
        currentMappings = currentMappings.map((m) =>
          m.id === id ? { ...m, ...mapping } : m
        )
      } else if (action === "delete" && id) {
        const itemToDelete = currentMappings.find((m) => m.id === id)
        currentMappings = currentMappings.filter((m) => m.id !== id)

        if (itemToDelete?.fileName) {
          await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([`${OTT_FOLDER}/${itemToDelete.fileName}`])
        }
      }
    }

    const jsonBuffer = Buffer.from(JSON.stringify(currentMappings, null, 2))
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(MAPPINGS_FILE, jsonBuffer, {
        contentType: "application/json",
        upsert: true,
      })

    return NextResponse.json({ success: true, mappings: currentMappings })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update platform mappings" },
      { status: 500 }
    )
  }
}
