"use client"

import { useState } from "react"
import { Download, FileText, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface FileInfo {
  filename: string
  file_size: number
  content_type: string
  download_count: number
  max_downloads: number
  expires_at: string | null
  created_at: string
}

export default function FileDownload() {
  const [accessKey, setAccessKey] = useState("")
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getFileInfo = async () => {
    if (!accessKey.trim()) {
      setError("Please enter an access key")
      return
    }

    setLoading(true)
    setError("")
    setFileInfo(null)

    try {
      const response = await fetch(`http://localhost:8000/api/info/${accessKey.trim()}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("File not found. Please check your access key.")
        } else if (response.status === 410) {
          throw new Error("File has expired or reached download limit.")
        } else {
          throw new Error("Failed to get file information")
        }
      }

      const info: FileInfo = await response.json()
      setFileInfo(info)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async () => {
    if (!accessKey.trim()) return

    setDownloading(true)

    try {
      const response = await fetch(`http://localhost:8000/api/download/${accessKey.trim()}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("File not found")
        } else if (response.status === 410) {
          throw new Error("File has expired or reached download limit")
        } else {
          throw new Error("Download failed")
        }
      }

      // Get filename from response headers or use fileInfo
      const contentDisposition = response.headers.get("content-disposition")
      let filename = fileInfo?.filename || "download"

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, "")
        }
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started!",
        description: `${filename} is being downloaded`,
      })

      // Refresh file info to show updated download count
      setTimeout(() => {
        getFileInfo()
      }, 1000)
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const getRemainingDownloads = () => {
    if (!fileInfo) return 0
    return Math.max(0, fileInfo.max_downloads - fileInfo.download_count)
  }

  const isExpired = () => {
    if (!fileInfo?.expires_at) return false
    return new Date() > new Date(fileInfo.expires_at)
  }

  const canDownload = () => {
    if (!fileInfo) return false
    return getRemainingDownloads() > 0 && !isExpired()
  }

  return (
    <div className="space-y-6">
      {/* Access Key Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="access-key">Access Key</Label>
          <div className="flex gap-2">
            <Input
              id="access-key"
              placeholder="Enter the file access key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && getFileInfo()}
            />
            <Button onClick={getFileInfo} disabled={loading}>
              {loading ? "Checking..." : "Check"}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* File Information */}
      {fileInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {fileInfo.filename}
            </CardTitle>
            <CardDescription>File information and download options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-gray-600">File Size</Label>
                <p className="font-medium">{formatFileSize(fileInfo.file_size)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Content Type</Label>
                <p className="font-medium">{fileInfo.content_type}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Downloads</Label>
                <p className="font-medium">
                  {fileInfo.download_count} / {fileInfo.max_downloads}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Created</Label>
                <p className="font-medium">{formatDate(fileInfo.created_at)}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={canDownload() ? "default" : "secondary"}>
                <Download className="w-3 h-3 mr-1" />
                {getRemainingDownloads()} downloads left
              </Badge>

              {fileInfo.expires_at && (
                <Badge variant={isExpired() ? "destructive" : "outline"}>
                  <Clock className="w-3 h-3 mr-1" />
                  {isExpired() ? "Expired" : `Expires ${formatDate(fileInfo.expires_at)}`}
                </Badge>
              )}
            </div>

            {/* Download Button */}
            <div className="pt-4">
              {canDownload() ? (
                <Button onClick={downloadFile} disabled={downloading} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? "Downloading..." : "Download File"}
                </Button>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isExpired()
                      ? "This file has expired and can no longer be downloaded."
                      : "This file has reached its download limit."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      {!fileInfo && !error && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">How to download</h4>
                <p className="text-sm text-blue-800">
                  Enter the access key you received from the file sender. We'll show you the file details and let you
                  download it if it's still available.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
