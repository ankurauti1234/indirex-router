import { NextRequest, NextResponse } from "next/server"
import { publishMqttMessage } from "@/lib/mqtt-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, payload, brokerUrl: customBrokerUrl, qos: requestQos } = body

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "A valid MQTT topic is required" },
        { status: 400 }
      )
    }

    if (payload === undefined || payload === null) {
      return NextResponse.json(
        { error: "Payload content is required" },
        { status: 400 }
      )
    }

    // Broker URL precedence: user-provided in request > environment variable > fallback placeholder
    const brokerUrl =
      (typeof customBrokerUrl === "string" && customBrokerUrl.trim()) ||
      process.env.MQTT_BROKER_URL ||
      process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
      "mqtt://localhost:1883"

    const username = process.env.MQTT_USERNAME
    const password = process.env.MQTT_PASSWORD

    // Normalize payload to single-line compact JSON string (embedded devices often fail on multi-line indented JSON)
    let payloadString: string
    try {
      const parsed = typeof payload === "string" ? JSON.parse(payload) : payload
      payloadString = JSON.stringify(parsed) // Compact: no newlines, no extra spaces
    } catch (e: unknown) {
      return NextResponse.json(
        {
          error: "Invalid JSON payload: " + (e instanceof Error ? e.message : "Parsing error"),
        },
        { status: 400 }
      )
    }

    const qos = requestQos === 1 ? 1 : 0

    const result = await publishMqttMessage(brokerUrl, topic.trim(), payloadString, {
      username,
      password,
      qos,
      retain: false,
      timeoutMs: 8000,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to publish MQTT message",
          brokerUrl,
          topic: topic.trim(),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Event published successfully",
      brokerUrl,
      topic: topic.trim(),
      messageId: result.messageId,
      publishedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const defaultBrokerUrl =
    process.env.MQTT_BROKER_URL ||
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
    ""

  return NextResponse.json({
    brokerConfigured: Boolean(defaultBrokerUrl),
    defaultBrokerUrl,
    defaultTopic: process.env.NEXT_PUBLIC_DEFAULT_WEARABLE_MQTT_TOPIC || "test/WM5FE0/message",
  })
}
