"use client"

import * as React from "react"
import {
  Send,
  Radio,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Layers,
  ArrowRight,
  Settings2,
  HelpCircle,
  Cake,
  ClipboardList,
  MessageSquare,
  Code2,
  Bell,
  Check,
  CheckCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PRESET_WEARABLE_EVENTS, type PresetEvent } from "@/lib/preset-wearable-events"
import { useTelemetryModeStore } from "@/lib/use-telemetry-mode-store"

interface PublishLogEntry {
  id: string
  timestamp: string
  topic: string
  type: string
  status: "success" | "error"
  details: string
  payloadPreview: string
}

interface AckEventItem {
  id: string
  topic: string
  payload: Record<string, unknown> | string
  receivedAt: string
}

type CategoryTab = "all" | "survey" | "birthday" | "instruction"

export function PublishEventsClient() {
  const { mode, setMode } = useTelemetryModeStore()

  const [activeCategory, setActiveCategory] = React.useState<CategoryTab>("birthday")
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>("bday-panelist")
  const [topic, setTopic] = React.useState<string>("test/WM5FE0/message")
  const [qos, setQos] = React.useState<0 | 1>(0)
  const [brokerUrl, setBrokerUrl] = React.useState<string>("")
  const [showBrokerConfig, setShowBrokerConfig] = React.useState<boolean>(false)

  // Current active payload stored as an object
  const [currentPayload, setCurrentPayload] = React.useState<Record<string, unknown>>(() => {
    const initial = PRESET_WEARABLE_EVENTS.find((p) => p.id === "bday-panelist") || PRESET_WEARABLE_EVENTS[0]
    return { ...initial.payload }
  })

  // Editable message specifically for birthday
  const [customMessage, setCustomMessage] = React.useState<string>(() => {
    const initial = PRESET_WEARABLE_EVENTS.find((p) => p.id === "bday-panelist") || PRESET_WEARABLE_EVENTS[0]
    return String(initial.payload.message || "")
  })

  const [showRawJson, setShowRawJson] = React.useState<boolean>(false)
  const [isPublishing, setIsPublishing] = React.useState<boolean>(false)
  const [publishFeedback, setPublishFeedback] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [logs, setLogs] = React.useState<PublishLogEntry[]>([])

  // Live Acks state for Notification Bell
  const [ackEvents, setAckEvents] = React.useState<AckEventItem[]>([])
  const [hasUnreadAcks, setHasUnreadAcks] = React.useState<boolean>(false)
  const [isAckPopoverOpen, setIsAckPopoverOpen] = React.useState<boolean>(false)

  // Fetch default broker configuration if available
  React.useEffect(() => {
    fetch("/api/wearable-events/publish")
      .then((res) => res.json())
      .then((data) => {
        if (data.defaultBrokerUrl) {
          setBrokerUrl(data.defaultBrokerUrl)
        }
        if (data.defaultTopic && !topic) {
          setTopic(data.defaultTopic)
        }
      })
      .catch(() => {
        // ignore
      })
  }, [])

  // Live SSE listener for acknowledgments
  React.useEffect(() => {
    const eventSource = new EventSource("/api/wearable-events/acks")

    eventSource.addEventListener("init", (event) => {
      try {
        const initialAcks: AckEventItem[] = JSON.parse(event.data)
        setAckEvents(initialAcks)
      } catch {
        // ignore
      }
    })

    eventSource.addEventListener("ack", (event) => {
      try {
        const newAck: AckEventItem = JSON.parse(event.data)
        setAckEvents((prev) => [newAck, ...prev.filter((a) => a.id !== newAck.id)].slice(0, 50))
        setHasUnreadAcks(true)
      } catch {
        // ignore
      }
    })

    return () => {
      eventSource.close()
    }
  }, [])

  // Auto-switch to wearable mode if accessed directly
  React.useEffect(() => {
    if (mode !== "wearable") {
      setMode("wearable")
    }
  }, [mode, setMode])

  const selectedPreset = React.useMemo(() => {
    return PRESET_WEARABLE_EVENTS.find((p) => p.id === selectedPresetId) || PRESET_WEARABLE_EVENTS[0]
  }, [selectedPresetId])

  const filteredPresets = React.useMemo(() => {
    if (activeCategory === "all") return PRESET_WEARABLE_EVENTS
    return PRESET_WEARABLE_EVENTS.filter((p) => p.category === activeCategory)
  }, [activeCategory])

  const handleSelectPreset = (preset: PresetEvent) => {
    setSelectedPresetId(preset.id)
    const cloned = { ...preset.payload }
    setCurrentPayload(cloned)
    setCustomMessage(String(cloned.message || ""))
    setPublishFeedback(null)
  }

  const handleMessageChange = (newMsg: string) => {
    setCustomMessage(newMsg)
    setCurrentPayload((prev) => ({
      ...prev,
      message: newMsg,
    }))
  }

  const handleResetCurrent = () => {
    if (selectedPreset) {
      const cloned = { ...selectedPreset.payload }
      setCurrentPayload(cloned)
      setCustomMessage(String(cloned.message || ""))
      setPublishFeedback(null)
    }
  }

  const handlePublish = async () => {
    setPublishFeedback(null)

    if (!topic.trim()) {
      setPublishFeedback({ type: "error", message: "Please provide a valid MQTT topic" })
      return
    }

    const payloadToSend: Record<string, unknown> = {
      ...currentPayload,
      ...(selectedPreset.category === "birthday" ? { message: customMessage } : {}),
    }

    setIsPublishing(true)

    try {
      const res = await fetch("/api/wearable-events/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          payload: payloadToSend,
          qos,
          brokerUrl: brokerUrl.trim() || undefined,
        }),
      })

      const result = await res.json()
      const eventType = (payloadToSend.type as string) || "custom"
      const now = new Date().toLocaleTimeString()

      if (!res.ok || !result.success) {
        const errorMsg = result.error || "Failed to publish MQTT event"
        setPublishFeedback({ type: "error", message: errorMsg })
        setLogs((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: now,
            topic: topic.trim(),
            type: eventType,
            status: "error",
            details: errorMsg,
            payloadPreview: JSON.stringify(payloadToSend),
          },
          ...prev.slice(0, 19),
        ])
      } else {
        const title = (payloadToSend.title as string) || eventType
        const successMsg = `Successfully published "${title}" to "${topic.trim()}" (QoS ${qos})`
        setPublishFeedback({ type: "success", message: successMsg })
        setLogs((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: now,
            topic: topic.trim(),
            type: eventType,
            status: "success",
            details: `Published (QoS ${qos})`,
            payloadPreview: JSON.stringify(payloadToSend),
          },
          ...prev.slice(0, 19),
        ])
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Network error"
      setPublishFeedback({ type: "error", message: errMsg })
    } finally {
      setIsPublishing(false)
    }
  }

  const categoryCounts = React.useMemo(() => {
    return {
      all: PRESET_WEARABLE_EVENTS.length,
      survey: PRESET_WEARABLE_EVENTS.filter((p) => p.category === "survey").length,
      birthday: PRESET_WEARABLE_EVENTS.filter((p) => p.category === "birthday").length,
      instruction: PRESET_WEARABLE_EVENTS.filter((p) => p.category === "instruction").length,
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header section with Notification Bell */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              WEARABLE ONLY
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Radio className="size-3 text-emerald-500" />
              AWS IoT MQTT Hub
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1 text-foreground">
            Publish Events
          </h1>
          <p className="text-sm text-muted-foreground">
            Trigger survey polls, celebrations, and instructions directly to panelist smartwatches.
          </p>
        </div>

        {/* Action Controls: Notification Bell, Broker Settings, Publish */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell Popover for ACKs */}
          <Popover
            open={isAckPopoverOpen}
            onOpenChange={(open) => {
              setIsAckPopoverOpen(open)
              if (open) setHasUnreadAcks(false)
            }}
          >
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="relative h-8 px-2.5 gap-1.5 border-border"
                  title="View received acknowledgments"
                />
              }
            >
              <Bell className="size-4 text-foreground" />
              <span className="text-xs font-semibold">Acks</span>
              {ackEvents.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                  {ackEvents.length}
                </span>
              )}
              {hasUnreadAcks && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-80 sm:w-96 p-0 shadow-lg border border-border"
            >
              <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCheck className="size-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">
                    Acknowledgments Received
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  test/WM5FE0/ack
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {ackEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                    <Bell className="size-5 text-muted-foreground/50" />
                    <p className="font-medium">No acks received yet</p>
                    <p className="text-[11px]">When a panelist interacts with the watch, acks will appear here.</p>
                  </div>
                ) : (
                  ackEvents.map((ack) => {
                    const isObj = typeof ack.payload === "object" && ack.payload !== null
                    const payloadObj = isObj ? (ack.payload as Record<string, unknown>) : null

                    const refId =
                      payloadObj?.message_id ||
                      payloadObj?.msg_id ||
                      payloadObj?.ref ||
                      "N/A"

                    const answer =
                      payloadObj?.answer ||
                      payloadObj?.option ||
                      payloadObj?.response ||
                      payloadObj?.status

                    return (
                      <div
                        key={ack.id}
                        className="p-3 hover:bg-muted/30 transition-colors flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Ack received
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                            <Clock className="size-2.5" />
                            {new Date(ack.receivedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Ref ID */}
                        <div className="flex items-center gap-1.5 text-xs mt-0.5">
                          <span className="text-muted-foreground font-medium">Ref:</span>
                          <span className="font-mono text-foreground font-semibold">
                            {String(refId)}
                          </span>
                        </div>

                        {/* Answer if present */}
                        {Boolean(answer) && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground font-medium">Response:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="size-3" />
                              {String(answer)}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBrokerConfig(!showBrokerConfig)}
            className="text-xs h-8"
          >
            <Settings2 className="size-3.5 mr-1" />
            Broker
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {isPublishing ? (
              <>
                <Spinner className="size-3.5 mr-1" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                Publish Event
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Optional Broker Settings Accordion */}
      {showBrokerConfig && (
        <Card className="border-dashed bg-muted/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="size-4 text-muted-foreground" />
              MQTT Broker Endpoint Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Leave blank to use the server environment default (<code>MQTT_BROKER_URL</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="w-full sm:flex-1">
                <Input
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  placeholder="e.g. mqtts://a3uoz4wfsx2nz3-ats.iot.ap-south-1.amazonaws.com:8883"
                  className="font-mono text-xs h-8.5 bg-background"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-8.5 shrink-0"
                onClick={() => setBrokerUrl("")}
              >
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback banner */}
      {publishFeedback && (
        <div
          className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs transition-all ${
            publishFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {publishFeedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">
              {publishFeedback.type === "success" ? "Event Dispatched" : "Publish Error"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed">{publishFeedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Events on Left, Details & Message Config on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Topic & Presets */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Topic & QoS Configuration Card */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Radio className="size-4 text-emerald-500" />
                Target MQTT Topic & QoS
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. test/WM5FE0/message"
                  className="font-mono text-xs h-9 bg-background"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5">
                  <span>Target watch topic</span>
                  <button
                    type="button"
                    onClick={() => setTopic("test/WM5FE0/message")}
                    className="text-primary hover:underline"
                  >
                    Reset default topic
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <span className="text-muted-foreground text-[11px] font-medium">QoS Level:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQos(0)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors border ${
                      qos === 0
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    QoS 0
                  </button>
                  <button
                    type="button"
                    onClick={() => setQos(1)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors border ${
                      qos === 1
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    QoS 1
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preset Events Card with Tabs */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Select Event
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {filteredPresets.length} Options
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("birthday")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                    activeCategory === "birthday"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Cake className="size-3 shrink-0" />
                  <span>Greetings ({categoryCounts.birthday})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("survey")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                    activeCategory === "survey"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <HelpCircle className="size-3 shrink-0" />
                  <span>Survey ({categoryCounts.survey})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("instruction")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                    activeCategory === "instruction"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ClipboardList className="size-3 shrink-0" />
                  <span>Instruction ({categoryCounts.instruction})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                    activeCategory === "all"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>All ({categoryCounts.all})</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-2">
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                          : "border-border hover:border-border/80 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          {preset.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-muted text-muted-foreground border">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Event Details & Message Editor */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <Card className="flex flex-col">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  {selectedPreset.title}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Type: <span className="font-mono text-foreground font-semibold uppercase">{String(currentPayload.type)}</span> • Message ID: <span className="font-mono text-foreground">{String(currentPayload.message_id)}</span>
                </CardDescription>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="h-7 px-2 text-xs"
                  title="Toggle raw JSON preview"
                >
                  <Code2 className="size-3 mr-1" />
                  {showRawJson ? "Hide JSON" : "View JSON"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetCurrent}
                  className="h-7 px-2 text-xs"
                  title="Reset to default message"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Reset
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex flex-col gap-4">
              {/* Event Attributes (Title, Sender, Options, Acknowledgment) */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Event Title:</span>
                  <span className="font-medium text-foreground">{String(currentPayload.title || "—")}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Sender:</span>
                  <span className="font-medium text-foreground">{String(currentPayload.sender || "—")}</span>
                </div>

                {Array.isArray(currentPayload.options) && (
                  <div className="col-span-2 pt-1 border-t">
                    <span className="text-[11px] text-muted-foreground block mb-1">Survey Options:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentPayload.options.map((opt, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-background border text-[11px] font-medium text-foreground"
                        >
                          {String(opt)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentPayload.require_ack !== undefined && (
                  <div className="col-span-2 pt-1 border-t flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Acknowledgment Required:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      currentPayload.require_ack ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-muted text-muted-foreground"
                    }`}>
                      {currentPayload.require_ack ? "YES (require_ack: true)" : "NO"}
                    </span>
                  </div>
                )}
              </div>

              {/* Message Box: Editable for Birthday ONLY, Read-Only for others */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-primary" />
                    {selectedPreset.category === "birthday"
                      ? "Custom Birthday Greeting Message:"
                      : "Event Message:"}
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedPreset.category === "birthday"
                      ? "Editable before publishing"
                      : "Read-only"}
                  </span>
                </div>
                {selectedPreset.category === "birthday" ? (
                  <textarea
                    value={customMessage}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    placeholder="Enter customized birthday greeting..."
                  />
                ) : (
                  <div className="w-full rounded-md border border-input bg-muted/40 p-3 text-xs leading-relaxed text-foreground select-text">
                    {String(currentPayload.message || "—")}
                  </div>
                )}
              </div>

              {/* Optional Raw JSON view */}
              {showRawJson && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground">Outgoing JSON Payload:</span>
                  <pre className="p-3 bg-muted/40 rounded border text-[11px] font-mono overflow-x-auto max-h-48 text-muted-foreground">
                    {JSON.stringify(
                      {
                        ...currentPayload,
                        ...(selectedPreset.category === "birthday" ? { message: customMessage } : {}),
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {/* Publish Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs h-9 px-5 font-semibold"
                >
                  {isPublishing ? (
                    <>
                      <Spinner className="size-3.5" />
                      Publishing via MQTT...
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      Publish to {topic || "Topic"}
                      <ArrowRight className="size-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session History Log */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5" />
                Session Outbound Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {logs.length === 0 ? (
                <div className="text-center py-3 text-muted-foreground text-xs">
                  No events sent yet in this session.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded border bg-card/60 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {log.timestamp}
                        </span>
                        <span className="font-mono text-[11px] text-foreground truncate">
                          {log.topic}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0 ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {log.status === "success" ? "SENT" : "FAILED"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
