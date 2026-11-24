import mqtt, { type MqttClient, type IClientOptions } from "mqtt"
import fs from "fs"
import path from "path"

export interface PublishResult {
  success: boolean
  messageId?: number
  error?: string
}

export interface PublishOptions {
  username?: string
  password?: string
  qos?: 0 | 1 | 2
  retain?: boolean
  timeoutMs?: number
  caPath?: string
  certPath?: string
  keyPath?: string
  clientId?: string
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

function findCertificates(options?: PublishOptions) {
  const possibleDirs = [
    path.join(process.cwd(), "certs"),
    path.join(process.cwd(), "..", "certs"),
  ]

  let certsDir = possibleDirs.find((d) => fs.existsSync(d)) || path.join(process.cwd(), "certs")

  let caFile = options?.caPath ? resolveFilePath(options.caPath) : null
  let certFile = options?.certPath ? resolveFilePath(options.certPath) : null
  let keyFile = options?.keyPath ? resolveFilePath(options.keyPath) : null

  if (fs.existsSync(certsDir)) {
    const files = fs.readdirSync(certsDir)

    // CA file (AmazonRootCA1.pem or root / CA)
    if (!caFile) {
      const match = files.find(
        (f) =>
          f.toLowerCase().includes("amazonroot") ||
          f.toLowerCase().includes("rootca") ||
          f.toLowerCase().includes("root-ca") ||
          f.toLowerCase() === "root.pem" ||
          f.toLowerCase() === "ca.pem"
      )
      if (match) caFile = path.join(certsDir, match)
    }

    // Client Certificate (e.g. *-certificate.pem.crt or *.crt)
    if (!certFile) {
      const match = files.find(
        (f) =>
          (f.includes(".crt") || f.includes("-certificate.pem")) &&
          !f.toLowerCase().includes("root") &&
          !f.toLowerCase().includes("amazon")
      )
      if (match) certFile = path.join(certsDir, match)
    }

    // Private key (e.g. *-private.pem.key or *.key)
    if (!keyFile) {
      const match = files.find(
        (f) =>
          (f.includes(".key") || f.includes("private")) &&
          !f.toLowerCase().includes("public")
      )
      if (match) keyFile = path.join(certsDir, match)
    }
  }

  return {
    ca: caFile && fs.existsSync(caFile) ? fs.readFileSync(caFile) : undefined,
    cert: certFile && fs.existsSync(certFile) ? fs.readFileSync(certFile) : undefined,
    key: keyFile && fs.existsSync(keyFile) ? fs.readFileSync(keyFile) : undefined,
    caFile,
    certFile,
    keyFile,
  }
}

export async function publishMqttMessage(
  rawBrokerUrl: string,
  topic: string,
  payload: string,
  options?: PublishOptions
): Promise<PublishResult> {
  const timeoutMs = options?.timeoutMs ?? 10000
  const qos = options?.qos ?? 0
  const retain = options?.retain ?? false

  let brokerUrl = rawBrokerUrl.trim()
  const isAwsIot = brokerUrl.includes("amazonaws.com")
  const isSslPort = brokerUrl.endsWith(":8883") || brokerUrl.includes(":8883")

  if (!brokerUrl.includes("://")) {
    if (isAwsIot || isSslPort) {
      brokerUrl = `mqtts://${brokerUrl}`
    } else {
      brokerUrl = `mqtt://${brokerUrl}`
    }
  }

  const { ca, cert, key, certFile, keyFile } = findCertificates(options)

  if (isAwsIot && (!cert || !key)) {
    return {
      success: false,
      error: `AWS IoT Core requires client certificates. Found files in certs/ directory: cert=${certFile || "missing"}, key=${keyFile || "missing"}.`,
    }
  }

  const clientOptions: IClientOptions = {
    connectTimeout: timeoutMs,
    reconnectPeriod: 0,
    clean: true,
  }

  if (ca) clientOptions.ca = ca
  if (cert) clientOptions.cert = cert
  if (key) clientOptions.key = key

  if (isAwsIot) {
    clientOptions.rejectUnauthorized = true
    clientOptions.protocol = "mqtts"
    clientOptions.protocolVersion = 4 // MQTT 3.1.1 required by AWS IoT
    // Default client ID if not provided
    clientOptions.clientId =
      options?.clientId ||
      process.env.MQTT_CLIENT_ID ||
      "indirex-router-" + Math.random().toString(16).substring(2, 10)
  }

  if (options?.username) clientOptions.username = options.username
  if (options?.password) clientOptions.password = options.password

  return new Promise<PublishResult>((resolve) => {
    let client: MqttClient | null = null
    let finished = false

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true
        if (client) {
          try {
            client.end(true)
          } catch {
            // ignore
          }
        }
        resolve({
          success: false,
          error: `Connection timed out after ${timeoutMs / 1000}s while reaching ${brokerUrl}.`,
        })
      }
    }, timeoutMs)

    try {
      client = mqtt.connect(brokerUrl, clientOptions)

      client.on("connect", () => {
        client?.publish(topic, payload, { qos, retain }, (err, packet) => {
          if (finished) return
          finished = true
          clearTimeout(timer)

          try {
            client?.end(false)
          } catch {
            // ignore
          }

          if (err) {
            resolve({
              success: false,
              error: err.message || "Failed to publish message",
            })
          } else {
            resolve({
              success: true,
              messageId: packet?.messageId,
            })
          }
        })
      })

      client.on("error", (err) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        try {
          client?.end(true)
        } catch {
          // ignore
        }
        resolve({
          success: false,
          error: err.message || "MQTT connection error",
        })
      })
    } catch (err: unknown) {
      if (!finished) {
        finished = true
        clearTimeout(timer)
        resolve({
          success: false,
          error: err instanceof Error ? err.message : "Failed to initialize MQTT connection",
        })
      }
    }
  })
}
