"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Server, Clock, User } from "lucide-react"

interface SessionInfo {
  userId: string
  username: string
  sessionExpiry: string
  timeRemaining: number
  isActive: boolean
}

export default function SessionMonitorPage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [refreshLogs, setRefreshLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const updateSessionInfo = () => {
      const storedUser = sessionStorage.getItem("sso_user")
      const storedExpiry = sessionStorage.getItem("session_expiry")

      if (storedUser && storedExpiry) {
        const user = JSON.parse(storedUser)
        const expiryDate = new Date(storedExpiry)
        const now = new Date()
        const timeRemaining = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000))

        setSessionInfo({
          userId: user.userId,
          username: user.username,
          sessionExpiry: storedExpiry,
          timeRemaining,
          isActive: timeRemaining > 0,
        })
      } else {
        setSessionInfo(null)
      }
    }

    // Update immediately
    updateSessionInfo()

    // Update every second
    const interval = setInterval(updateSessionInfo, 1000)

    return () => clearInterval(interval)
  }, [])

  const simulateServerRefresh = async () => {
    if (!sessionInfo) return

    setLoading(true)
    try {
      const response = await fetch("/api/server-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: sessionInfo.userId,
          sessionId: `session_${Date.now()}`,
          apiKey: "your-backend-api-key",
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update session expiry in storage
        sessionStorage.setItem("session_expiry", data.expiresAt)

        // Add to refresh logs
        const logEntry = `${new Date().toLocaleTimeString()}: Server refreshed session for ${sessionInfo.username}`
        setRefreshLogs((prev) => [logEntry, ...prev.slice(0, 9)]) // Keep last 10 logs

        // Trigger a page refresh to update session info
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to simulate server refresh:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Session Monitor</span>
            </CardTitle>
            <CardDescription>Monitor session timeout and test server-to-server refresh functionality</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">User:</span>
                      <span className="text-sm">{sessionInfo.username}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={sessionInfo.isActive ? "default" : "destructive"}>
                        {sessionInfo.isActive ? "Active" : "Expired"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Time Remaining:</span>
                      <span
                        className={`text-sm font-mono ${
                          sessionInfo.timeRemaining < 60 ? "text-red-600 font-bold" : "text-green-600"
                        }`}
                      >
                        {formatTime(sessionInfo.timeRemaining)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Expires At:</span>
                      <span className="text-sm font-mono">
                        {new Date(sessionInfo.sessionExpiry).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={simulateServerRefresh}
                    disabled={loading || !sessionInfo.isActive}
                    className="w-full"
                  >
                    <Server className="h-4 w-4 mr-2" />
                    {loading ? "Refreshing..." : "Simulate Server-to-Server Refresh"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This simulates your backend calling the refresh endpoint to keep the session alive
                  </p>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>No active session found. Please login through the SSO portal first.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {refreshLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Refresh Activity Log</span>
              </CardTitle>
              <CardDescription>Recent server-to-server session refresh activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {refreshLogs.map((log, index) => (
                  <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none space-y-4">
              <div>
                <h4 className="font-semibold">Session Timeout Testing:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Login through the SSO portal</li>
                  <li>Watch the countdown timer - session expires in 5 minutes</li>
                  <li>You'll get a warning 1 minute before expiry</li>
                  <li>Session automatically expires and clears all data</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold">Server-to-Server Refresh Testing:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Use the "Simulate Server-to-Server Refresh" button</li>
                  <li>This extends the session by another 5 minutes</li>
                  <li>Your backend would call this endpoint periodically</li>
                  <li>Monitor the activity log to see refresh events</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold">API Endpoints for Your Backend:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    <code>POST /api/server-refresh</code> - Refresh session from your backend
                  </li>
                  <li>
                    <code>GET /api/refresh-session</code> - Validate session status
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
