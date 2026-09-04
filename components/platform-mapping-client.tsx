"use client"

import * as React from "react"
import {
  Layers,
  Plus,
  Search,
  Upload,
  Copy,
  Check,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Info,
  Tv,
} from "lucide-react"
import { PageContainer } from "./page-container"
import {
  PlatformMappingItem,
  getCustomPlatformMappings,
  saveCustomPlatformMapping,
  updatePlatformMapping,
  deletePlatformMapping,
  SUPABASE_STORAGE_URL_PREFIX,
} from "@/lib/platform-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function PlatformMappingClient() {
  const [platforms, setPlatforms] = React.useState<PlatformMappingItem[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Add / Edit Modal State
  const [showDialog, setShowDialog] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<PlatformMappingItem | null>(null)
  const [platName, setPlatName] = React.useState("")
  const [platKey, setPlatKey] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  // Load platforms on mount
  const loadPlatforms = React.useCallback(() => {
    const list = getCustomPlatformMappings()
    setPlatforms(list)
  }, [])

  React.useEffect(() => {
    loadPlatforms()
  }, [loadPlatforms])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    loadPlatforms()
    setTimeout(() => setIsRefreshing(false), 400)
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handleOpenCreate = () => {
    setEditingItem(null)
    setPlatName("")
    setPlatKey("")
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setUploadError(null)
    setShowDialog(true)
  }

  const handleOpenEdit = (item: PlatformMappingItem) => {
    setEditingItem(item)
    setPlatName(item.name)
    setPlatKey(item.key)
    setSelectedFile(null)
    setFilePreviewUrl(item.iconUrl)
    setUploadError(null)
    setShowDialog(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const preview = URL.createObjectURL(file)
      setFilePreviewUrl(preview)
      setUploadError(null)
      if (!platKey && platName) {
        setPlatKey(platName.toLowerCase().replace(/[^a-z0-9]/g, "-"))
      }
    }
  }

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platName.trim() || !platKey.trim()) {
      setUploadError("Platform Name and Key/Alias are required.")
      return
    }

    let finalIconUrl = editingItem?.iconUrl || ""
    let finalFileName = editingItem?.fileName || ""

    if (selectedFile) {
      setIsUploading(true)
      setUploadError(null)
      try {
        const formData = new FormData()
        formData.append("file", selectedFile)

        const res = await fetch("/api/upload-platform-icon", {
          method: "POST",
          body: formData,
        })

        const result = await res.json()

        if (!res.ok || !result.success) {
          throw new Error(result.error || "Upload failed")
        }

        finalIconUrl = result.publicUrl
        finalFileName = result.fileName
      } catch (err: any) {
        setIsUploading(false)
        setUploadError(`Failed to upload icon: ${err.message || "Unknown error"}`)
        return
      }
      setIsUploading(false)
    } else if (!finalIconUrl) {
      const formattedKey = platKey.toLowerCase().replace(/[^a-z0-9]/g, "-")
      finalFileName = `${formattedKey}.jpeg`
      finalIconUrl = `${SUPABASE_STORAGE_URL_PREFIX}${finalFileName}`
    }

    if (editingItem) {
      updatePlatformMapping(editingItem.id, {
        name: platName.trim(),
        key: platKey.trim().toLowerCase(),
        iconUrl: finalIconUrl,
        fileName: finalFileName,
      })
    } else {
      saveCustomPlatformMapping({
        name: platName.trim(),
        key: platKey.trim().toLowerCase(),
        iconUrl: finalIconUrl,
        fileName: finalFileName,
      })
    }

    // Reset and reload
    loadPlatforms()
    setShowDialog(false)
    setEditingItem(null)
    setPlatName("")
    setPlatKey("")
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setUploadError(null)
  }

  const handleDelete = (id: string) => {
    const updated = deletePlatformMapping(id)
    setPlatforms(updated)
  }

  const filteredPlatforms = React.useMemo(() => {
    if (!searchTerm.trim()) return platforms
    const term = searchTerm.toLowerCase().trim()
    return platforms.filter(
      (p) => p.name.toLowerCase().includes(term) || p.key.toLowerCase().includes(term) || p.fileName?.toLowerCase().includes(term)
    )
  }, [platforms, searchTerm])

  return (
    <PageContainer
      title="Platform Mapping"
      description="Manage OTT service platforms and icon logos stored in Supabase storage bucket 'router-device-assets/ott-icons'."
    >
      <div className="space-y-4 max-w-[1200px] mx-auto pb-12">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search platforms by name, key, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs font-mono bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 cursor-pointer"
              title="Refresh platform mappings"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh / Sync Bucket
            </Button>

            <Button
              onClick={handleOpenCreate}
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer"
            >
              <Plus className="size-3.5" />
              Add Platform Mapping
            </Button>
          </div>
        </div>

        {/* Bucket Info Banner */}
        <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground select-none">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-semibold text-foreground">Supabase Storage Bucket: </span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[11px] border border-border">
              router-device-assets / ott-icons
            </code>
            <p className="mt-1 text-muted-foreground">
              Icons uploaded here are rendered automatically across Rules conditions, Events Explorer details, Sessions, and Dashboard telemetry feeds.
            </p>
          </div>
        </div>

        {/* Platforms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredPlatforms.length === 0 ? (
            <div className="col-span-full p-8 text-center text-muted-foreground font-mono bg-card border border-border rounded-lg text-xs">
              No platform mappings match "{searchTerm}". Click "Add Platform Mapping" to create one.
            </div>
          ) : (
            filteredPlatforms.map((plat) => (
              <div
                key={plat.id}
                className="flex items-center justify-between p-4 border border-border bg-card rounded-lg hover:border-border/80 transition-all shadow-2xs gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-12 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {plat.iconUrl ? (
                      <img
                        src={plat.iconUrl}
                        alt={plat.name}
                        className="size-full object-cover select-none"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    ) : (
                      <Tv className="size-6 text-muted-foreground/60" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{plat.name}</h4>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded border border-border text-[11px] truncate">
                        key: {plat.key}
                      </span>
                      {plat.fileName && (
                        <span className="text-[11px] text-muted-foreground/70 truncate hidden sm:inline">
                          file: {plat.fileName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    onClick={() => handleCopyUrl(plat.iconUrl)}
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy Public Icon Storage URL"
                  >
                    {copiedUrl === plat.iconUrl ? (
                      <Check className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>

                  <a
                    href={plat.iconUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Open Icon Image in New Tab"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>

                  <Button
                    onClick={() => handleOpenEdit(plat)}
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Edit Platform Mapping"
                  >
                    <Edit3 className="size-3.5" />
                  </Button>

                  <Button
                    onClick={() => handleDelete(plat.id)}
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Delete Platform Mapping"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add / Edit Platform Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                {editingItem ? "Edit Platform Mapping" : "Add New Platform Mapping"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure platform details and icon logos stored in Supabase storage <code className="font-mono text-primary">router-device-assets/ott-icons</code>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSavePlatform} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Platform Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Disney+ Hotstar, Apple TV, Twitch"
                  value={platName}
                  onChange={(e) => {
                    setPlatName(e.target.value)
                    if (!platKey && !editingItem) {
                      setPlatKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                    }
                  }}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Platform Key / Keyword Alias</label>
                <Input
                  type="text"
                  placeholder="e.g. disney-plus, apple-tv"
                  value={platKey}
                  onChange={(e) => setPlatKey(e.target.value)}
                  required
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Events or rule conditions matching this key will automatically display the logo.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {editingItem ? "Update Platform Logo (Optional)" : "Upload Platform Logo (Supabase Storage)"}
                </label>
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-4 text-center cursor-pointer relative bg-muted/10">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {filePreviewUrl ? (
                    <div className="flex items-center justify-center gap-3">
                      <img src={filePreviewUrl} alt="Preview" className="size-12 rounded object-cover border border-border shadow-2xs" />
                      <div className="text-left text-xs font-mono">
                        <p className="font-semibold text-foreground">{selectedFile ? selectedFile.name : (editingItem?.fileName || "Current Icon Logo")}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedFile ? "New file ready to upload to ott-icons/" : "Click or drag to replace image"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-xs">
                      <Upload className="size-5 text-muted-foreground" />
                      <span>Click or drag image file here (PNG, JPEG, WebP)</span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">Will save to ott-icons/ in router-device-assets</span>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded font-mono">
                  {uploadError}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDialog(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isUploading}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  {isUploading ? "Saving..." : (editingItem ? "Update Platform" : "Save Platform")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}
