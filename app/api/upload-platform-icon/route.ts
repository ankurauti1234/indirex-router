import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

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

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      fileName: rawFileName,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during icon upload" },
      { status: 500 }
    )
  }
}
