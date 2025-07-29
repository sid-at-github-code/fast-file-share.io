"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, Copy, Check, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface UploadResult {
  id: string
  access_key: string
  filename: string
  file_size: number
  expires_at: string | null
  download_url: string
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [maxDownloads, setMaxDownloads] = useState("10")
  const [expiresIn, setExpiresIn] = useState("24")
  const [copiedKey, setCopiedKey] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        })
        return
      }
      setFile(selectedFile)
      setUploadResult(null)
    },
    [toast],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const uploadFile = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
        headers: {
          "max-downloads": maxDownloads,
          "expires-in-hours": expiresIn,
        },
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result: UploadResult = await response.json()
      setUploadResult(result)

      toast({
        title: "Upload successful!",
        description: "Your file has been uploaded and is ready to share",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const copyAccessKey = async () => {
    if (uploadResult) {
      await navigator.clipboard.writeText(uploadResult.access_key)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
      toast({
        title: "Access key copied!",
        description: "Share this key with others to let them download the file",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (uploadResult) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Upload Successful!
            </CardTitle>
            <CardDescription className="text-green-700">
              Your file has been uploaded and is ready to share
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div>
                <p className="font-medium">{uploadResult.filename}</p>
                <p className="text-sm text-gray-600">{formatFileSize(uploadResult.file_size)}</p>
              </div>
              <Badge variant="secondary">Ready</Badge>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Access Key</Label>
              <div className="flex gap-2">
                <Input value={uploadResult.access_key} readOnly className="font-mono bg-gray-50" />
                <Button onClick={copyAccessKey} variant="outline" size="icon" className="shrink-0 bg-transparent">
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-600">Share this key with others to let them download the file</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-gray-600">Max Downloads</Label>
                <p className="font-medium">{maxDownloads}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Expires In</Label>
                <p className="font-medium">{expiresIn} hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => {
            setUploadResult(null)
            setFile(null)
            setUploadProgress(0)
          }}
          variant="outline"
          className="w-full"
        >
          Upload Another File
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Share Settings
          </CardTitle>
          <CardDescription>Configure how your file can be accessed</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-downloads">Max Downloads</Label>
            <Select value={maxDownloads} onValueChange={setMaxDownloads}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 download</SelectItem>
                <SelectItem value="5">5 downloads</SelectItem>
                <SelectItem value="10">10 downloads</SelectItem>
                <SelectItem value="25">25 downloads</SelectItem>
                <SelectItem value="100">100 downloads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires-in">Expires In</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          file ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {file ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-lg">{file.name}</p>
              <p className="text-gray-600">{formatFileSize(file.size)}</p>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button onClick={uploadFile} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
              <Button variant="outline" onClick={() => setFile(null)} disabled={uploading}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Drop your file here or click to browse</p>
              <p className="text-gray-600">Maximum file size: 10MB</p>
            </div>
            <input
              type="file"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              id="file-input"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-input" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
