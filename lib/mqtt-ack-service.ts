import mqtt, { type MqttClient, type IClientOptions } from "mqtt"
import fs from "fs"
import path from "path"

export interface AckEvent {
  id: string
  topic: string
  payload: Record<string, unknown> | string
  receivedAt: string
}

// Global in-memory ring buffer to hold latest acks
declare global {
  // eslint-disable-next-line no-var
  var __ACK_EVENTS_BUFFER: AckEvent[] | undefined
  // eslint-disable-next-line no-var
  var __MQTT_ACK_CLIENT: MqttClient | undefined
  // eslint-disable-next-line no-var
  var __ACK_LISTENERS: Set<(event: AckEvent) => void> | undefined
}

globalThis.__ACK_EVENTS_BUFFER = globalThis.__ACK_EVENTS_BUFFER || []
globalThis.__ACK_LISTENERS = globalThis.__ACK_LISTENERS || new Set()

export function getAckHistory(): AckEvent[] {
  return globalThis.__ACK_EVENTS_BUFFER || []
}

export function subscribeToAcks(listener: (event: AckEvent) => void): () => void {
  globalThis.__ACK_LISTENERS?.add(listener)
  return () => {
    globalThis.__ACK_LISTENERS?.delete(listener)
  }
}

function resolveFilePath(filePath: string): string | null {
  if (path.isAbsolute(filePath)) {
    return fs.existsSync(filePath) ? filePath : null
  }
  const relativeToCwd = path.join(process.cwd(), filePath)
  if (fs.existsSync(relativeToCwd)) {
    return relativeToCwd
  }
  return null
}

function findCertificates() {
  const possibleDirs = [
    path.join(process.cwd(), "certs"),
    path.join(process.cwd(), "..", "certs"),
  ]

  const certsDir = possibleDirs.find((d) => fs.existsSync(d)) || path.join(process.cwd(), "certs")

  let caFile: string | null = null
  let certFile: string | null = null
  let keyFile: string | null = null

  if (fs.existsSync(certsDir)) {
    const files = fs.readdirSync(certsDir)

    const caMatch = files.find(
      (f) =>
        f.toLowerCase().includes("amazonroot") ||
        f.toLowerCase().includes("rootca") ||
        f.toLowerCase().includes("root-ca") ||
        f.toLowerCase() === "root.pem" ||
        f.toLowerCase() === "ca.pem"
    )
    if (caMatch) caFile = path.join(certsDir, caMatch)

    const certMatch = files.find(
      (f) =>
        (f.includes(".crt") || f.includes("-certificate.pem")) &&
        !f.toLowerCase().includes("root") &&
        !f.toLowerCase().includes("amazon")
    )
    if (certMatch) certFile = path.join(certsDir, certMatch)

    const keyMatch = files.find(
      (f) =>
        (f.includes(".key") || f.includes("private")) &&
        !f.toLowerCase().includes("public")
    )
    if (keyMatch) keyFile = path.join(certsDir, keyMatch)
  }

  return {
    ca: caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile) : undefined,
    cert: certFile && fs.existsSync(certFile) ? fs.readFileSync(certFile) : undefined,
    key: keyFile && fs.existsSync(keyFile) ? fs.readFileSync(keyFile) : undefined,
  }
}

export function startAckListener(targetTopic = "test/WM5FE0/ack"): void {
  if (globalThis.__MQTT_ACK_CLIENT && globalThis.__MQTT_ACK_CLIENT.connected) {
    // Already active and connected
    return
  }

  const rawBrokerUrl =
    process.env.MQTT_BROKER_URL ||
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
    "mqtts://a3uoz4wfsx2nz3-ats.iot.ap-south-1.amazonaws.com:8883"

  let brokerUrl = rawBrokerUrl.trim()
  if (!brokerUrl.includes("://")) {
    brokerUrl = `mqtts://${brokerUrl}`
  }

  const { ca, cert, key } = findCertificates()

  const clientOptions: IClientOptions = {
    connectTimeout: 8000,
    reconnectPeriod: 5000, // keep reconnecting in background to always receive acks
    clean: true,
    protocolVersion: 4,
    clientId: "ack-listener-" + Math.random().toString(16).substring(2, 10),
  }

  if (ca) clientOptions.ca = ca
  if (cert) clientOptions.cert = cert
  if (key) clientOptions.key = key
  if (brokerUrl.includes("amazonaws.com")) {
    clientOptions.rejectUnauthorized = true
    clientOptions.protocol = "mqtts"
  }

  try {
    const client = mqtt.connect(brokerUrl, clientOptions)
    globalThis.__MQTT_ACK_CLIENT = client

    client.on("connect", () => {
      console.log(`[ACK Listener] Connected to ${brokerUrl}. Subscribing to ${targetTopic}...`)
      client.subscribe(targetTopic, { qos: 0 }, (err) => {
        if (err) {
          console.error(`[ACK Listener] Subscription error on ${targetTopic}:`, err)
        } else {
          console.log(`[ACK Listener] Successfully subscribed to ${targetTopic}`)
        }
      })
      // Also subscribe to wildcard ack topics if needed
      client.subscribe("test/+/ack", { qos: 0 })
      client.subscribe("indirex/+/ack", { qos: 0 })
    })

    client.on("message", (topic, payloadBuffer) => {
      const rawText = payloadBuffer.toString()
      let parsed: Record<string, unknown> | string = rawText
      try {
        parsed = JSON.parse(rawText)
      } catch {
        // preserve as string
      }

      const event: AckEvent = {
        id: Math.random().toString(36).substring(2, 9),
        topic,
        payload: parsed,
        receivedAt: new Date().toISOString(),
      }

      // Add to buffer (keep last 50)
      if (!globalThis.__ACK_EVENTS_BUFFER) globalThis.__ACK_EVENTS_BUFFER = []
      globalThis.__ACK_EVENTS_BUFFER.unshift(event)
      if (globalThis.__ACK_EVENTS_BUFFER.length > 50) {
        globalThis.__ACK_EVENTS_BUFFER.pop()
      }

      // Broadcast to all active SSE listeners
      globalThis.__ACK_LISTENERS?.forEach((fn) => {
        try {
          fn(event)
        } catch {
          // ignore
        }
      })
    })

    client.on("error", (err) => {
      console.error("[ACK Listener] MQTT Error:", err.message)
    })
  } catch (err) {
    console.error("[ACK Listener] Init Error:", err)
  }
}
