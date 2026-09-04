import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const nameParam = formData.get("name") as string | null
    const keyParam = formData.get("key") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase service configuration missing." },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const rawFileName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-")
    const storagePath = `ott-icons/${rawFileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage
      .from("router-device-assets")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("router-device-assets")
      .getPublicUrl(storagePath)

    const publicUrl = publicUrlData.publicUrl

    // Automatically sync into mappings.json in Supabase Storage
    try {
      let mappings: any[] = []
      const { data: mappingFileData } = await supabaseAdmin.storage
        .from("router-device-assets")
        .download("mappings.json")

      if (mappingFileData) {
        try {
          const text = await mappingFileData.text()
          mappings = JSON.parse(text)
        } catch (e) {
          mappings = []
        }
      }

      const fileKey = (keyParam || rawFileName.replace(/\.[^/.]+$/, "")).toLowerCase()
      const formattedName = nameParam || fileKey
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")

      const existingIndex = mappings.findIndex(
        (m) => m.fileName === rawFileName || m.key.toLowerCase() === fileKey
      )

      if (existingIndex >= 0) {
        mappings[existingIndex] = {
          ...mappings[existingIndex],
          name: formattedName,
          key: fileKey,
          iconUrl: publicUrl,
          fileName: rawFileName,
        }
      } else {
        mappings.push({
          id: `plat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: formattedName,
          key: fileKey,
          iconUrl: publicUrl,
          fileName: rawFileName,
        })
      }

      const jsonBuffer = Buffer.from(JSON.stringify(mappings, null, 2))
      await supabaseAdmin.storage
        .from("router-device-assets")
        .upload("mappings.json", jsonBuffer, {
          contentType: "application/json",
          upsert: true,
        })
    } catch (syncErr) {
      console.error("Failed to update mappings.json during upload:", syncErr)
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      fileName: rawFileName,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during icon upload" },
      { status: 500 }
    )
  }
}
