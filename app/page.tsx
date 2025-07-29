"use client"

import { useState } from "react"
import { Upload, Download, Share2, Clock, Users, Shield, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import FileUpload from "@/components/file-upload"
import FileDownload from "@/components/file-download"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("upload")
  const { toast } = useToast()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                FileShare
              </h1>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              <Zap className="w-3 h-3 mr-1" />
              Fast & Secure
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Shield className="w-4 h-4 mr-2" />
            End-to-end encrypted file sharing
          </div>

          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Share files
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              securely
            </span>
          </h2>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload files up to 10MB, generate secure access keys, and share with anyone. Files auto-expire and have
            download limits for maximum security.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border">
              <Upload className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-sm font-medium">10MB Max</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border">
              <Clock className="w-4 h-4 mr-2 text-orange-600" />
              <span className="text-sm font-medium">Auto Expire</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm border">
              <Users className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-sm font-medium">Download Limits</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main App */}
      <section className="pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">Start Sharing</CardTitle>
              <CardDescription>Upload a file or enter an access key to download</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="download" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-6">
                  <FileUpload />
                </TabsContent>

                <TabsContent value="download" className="space-y-6">
                  <FileDownload />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Built for Security & Speed</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Enterprise-grade security with consumer-friendly simplicity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Secure by Default</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Every file is protected with unique access keys and automatic expiration
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">Optimized upload and download speeds with progress tracking</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Smart Limits</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">Control who can access your files with download limits and expiration</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-white">
        <div className="container mx-auto text-center">
          <p className="text-gray-600">Built with FastAPI & Next.js • Secure file sharing made simple</p>
        </div>
      </footer>
    </div>
  )
}
