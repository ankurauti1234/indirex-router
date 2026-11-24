import { NextRequest, NextResponse } from "next/server"
import { startAckListener, getAckHistory, subscribeToAcks, type AckEvent } from "@/lib/mqtt-ack-service"

// Ensure background MQTT subscription is active
startAckListener()

export async function GET(req: NextRequest) {
  const isSSE = req.headers.get("accept")?.includes("text/event-stream")

  if (isSSE) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Send initial historical ack events
        const history = getAckHistory()
        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify(history)}\n\n`)
        )

        // Listen for new ack events in real-time
        const unsubscribe = subscribeToAcks((event: AckEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ack\ndata: ${JSON.stringify(event)}\n\n`)
            )
          } catch {
            // client disconnected
          }
        })

        // Heartbeat interval to keep connection open
        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`))
          } catch {
            clearInterval(interval)
            unsubscribe()
          }
        }, 15000)

        req.signal.addEventListener("abort", () => {
          clearInterval(interval)
          unsubscribe()
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  // Fallback to standard JSON response
  return NextResponse.json({
    topic: "test/WM5FE0/ack",
    events: getAckHistory(),
  })
}
