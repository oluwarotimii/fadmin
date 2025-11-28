"use client"

import { useState, useEffect } from "react"
import FormField from "@/components/form-field"

export default function TrendingBannerModule() {
    const [currentBanner, setCurrentBanner] = useState<any>(null)
    const [imageUrl, setImageUrl] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)

    // Fetch current banner
    const fetchBanner = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/banner")
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch banner")
            }

            setCurrentBanner(data.data)
            setError(null)
        } catch (err: any) {
            console.error("Error fetching banner:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBanner()
    }, [])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!imageUrl.trim()) {
            alert("Please enter an image URL")
            return
        }

        try {
            setUploading(true)
            const response = await fetch("/api/banner", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    image_url: imageUrl,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to upload banner")
            }

            alert("Banner uploaded successfully!")
            setImageUrl("")
            await fetchBanner()
        } catch (err: any) {
            console.error("Error uploading banner:", err)
            alert(`Error: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = async () => {
        if (!confirm("Are you sure you want to remove the current banner?")) {
            return
        }

        try {
            const response = await fetch("/api/banner", {
                method: "DELETE",
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to remove banner")
            }

            alert("Banner removed successfully!")
            await fetchBanner()
        } catch (err: any) {
            console.error("Error removing banner:", err)
            alert(`Error: ${err.message}`)
        }
    }

    if (loading) {
        return (
            <div className="p-4 md:p-6">
                <p className="text-muted-foreground">Loading banner...</p>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                    <p className="font-medium">Error loading banner</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Form */}
                <div className="md:col-span-1">
                    <form onSubmit={handleUpload} className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Upload Trending Banner</h2>

                        <FormField
                            label="Image URL"
                            type="text"
                            placeholder="https://example.com/banner.jpg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            required
                        />

                        <p className="text-xs text-muted-foreground">
                            This will replace the current banner. Only one banner can be active at a time.
                        </p>

                        <button
                            type="submit"
                            disabled={uploading}
                            className={`
                w-full py-2 px-4 rounded-md font-medium text-sm
                bg-primary text-primary-foreground hover:bg-blue-600
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            {uploading ? "Uploading..." : "Upload Banner"}
                        </button>
                    </form>
                </div>

                {/* Current Banner Preview */}
                <div className="md:col-span-1">
                    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Current Banner</h2>

                        {currentBanner ? (
                            <div className="space-y-4">
                                <div className="relative w-full aspect-[16/9] bg-muted rounded-lg overflow-hidden">
                                    <img
                                        src={currentBanner.image_url}
                                        alt="Trending Banner"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23ddd' width='400' height='225'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E"
                                        }}
                                    />
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p><span className="font-medium">Status:</span> {currentBanner.status}</p>
                                    <p><span className="font-medium">Created:</span> {new Date(currentBanner.created_at).toLocaleString()}</p>
                                    <p className="break-all"><span className="font-medium">URL:</span> {currentBanner.image_url}</p>
                                </div>

                                <button
                                    onClick={handleRemove}
                                    className="w-full py-2 px-4 rounded-md font-medium text-sm bg-destructive text-destructive-foreground hover:bg-red-700 transition-colors duration-200"
                                >
                                    Remove Banner
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No active banner</p>
                                <p className="text-sm mt-2">Upload a banner to display in your app</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Public API Info */}
            <div className="bg-muted/50 rounded-lg border border-border p-4">
                <h3 className="font-semibold text-sm mb-2">📱 Expo App Integration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                    Fetch the active banner from your Expo app using this public endpoint:
                </p>
                <code className="block bg-background px-3 py-2 rounded text-xs font-mono">
                    GET /api/banner/public
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                    No authentication required. Returns null if no active banner.
                </p>
            </div>
        </div>
    )
}
