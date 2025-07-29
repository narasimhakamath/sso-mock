"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogOut, ExternalLink } from "lucide-react"
import { JSEncrypt } from "jsencrypt"
import SHA256 from "crypto-js/sha256"

interface SSOUser {
  username: string
  userId: string
}

export default function SSOMockApp() {
  const [user, setUser] = useState<SSOUser | null>(null)
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showIframe, setShowIframe] = useState(false)
  const [angularAppUrl, setAngularAppUrl] = useState("https://dev.dfl.datanimbus.com/cx/parties")
  const [publicKey, setPublicKey] = useState(`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstoUWsc/G+9eAMjb8R1+
uAvxVLJ5FllEE3BwS1ac7jg/rIi5aWx38nT/c9E2+EkWMyvpHH8l9zKMLPRoo+T5
5z8IYlyYuGkFK5TDLLVfyWZWwXNsx8lNs/4ZW7vhKeLy7Afow23BuiVGB6QBn1Lc
kSV3cU0XdUSCYQJ83k4TVPqArOpWIoVJHSoRyQIQtIy45pGrg1GVknfJWPxACrHE
iTJHnCaPGoohCL+vM37omxEdjU3aDcZCihdAUTatz/R8LCcgwf4jx7CeNiy6HfG2
idt1zXdzEC8cqr1Z9l/M8Pc+yCXOFyN0aSWzd9Y2cvQaKcXWjePEHAZTk26V4bPE
AwIDAQAB
-----END PUBLIC KEY-----`)

  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [sessionWarning, setSessionWarning] = useState(false)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = sessionStorage.getItem("sso_user")
    const storedExpiry = sessionStorage.getItem("session_expiry")

    if (storedUser && storedExpiry) {
      const expiryDate = new Date(storedExpiry)
      const now = new Date()

      if (expiryDate > now) {
        setUser(JSON.parse(storedUser))
        setSessionExpiry(expiryDate)
        startSessionTimer(expiryDate)
      } else {
        // Session expired, clear storage
        handleSessionExpired()
      }
    }
  }, [])

  // Add countdown effect
  useEffect(() => {
    if (sessionExpiry && user) {
      countdownRef.current = setInterval(() => {
        const now = new Date()
        const remaining = Math.max(0, Math.floor((sessionExpiry.getTime() - now.getTime()) / 1000))
        setTimeRemaining(remaining)

        if (remaining === 0) {
          handleSessionExpired()
        }
      }, 1000)

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
        }
      }
    }
  }, [sessionExpiry, user])

  const startSessionTimer = (expiry: Date) => {
    const now = new Date()
    const timeUntilExpiry = expiry.getTime() - now.getTime()
    const timeUntilWarning = timeUntilExpiry - 60 * 1000 // 1 minute before expiry

    // Clear existing timers
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)

    // Set warning timer (1 minute before expiry)
    if (timeUntilWarning > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setSessionWarning(true)
      }, timeUntilWarning)
    } else {
      setSessionWarning(true)
    }

    // Set session expiry timer
    sessionTimeoutRef.current = setTimeout(() => {
      handleSessionExpired()
    }, timeUntilExpiry)
  }

  const handleSessionExpired = () => {
    sessionStorage.removeItem("sso_user")
    sessionStorage.removeItem("session_expiry")
    sessionStorage.removeItem("jwt_token")
    sessionStorage.removeItem("encrypted_payload")
    setUser(null)
    setSessionExpiry(null)
    setSessionWarning(false)
    setShowIframe(false)
    setError("Session expired. Please login again.")

    // Clear all timers
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const refreshSession = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/refresh-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newExpiry = new Date(data.expiresAt)
        setSessionExpiry(newExpiry)
        setSessionWarning(false)
        sessionStorage.setItem("session_expiry", newExpiry.toISOString())
        startSessionTimer(newExpiry)
        setError("")
      } else {
        throw new Error("Failed to refresh session")
      }
    } catch (err) {
      setError("Failed to refresh session. Please login again.")
      handleSessionExpired()
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError("Username is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Simulate login process
      const userData: SSOUser = {
        username: username.trim(),
        userId: `user_${Date.now()}`, // Mock user ID
      }

      // Set session expiry to 5 minutes from now
      const expiryDate = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

      // Store user and expiry in session
      sessionStorage.setItem("sso_user", JSON.stringify(userData))
      sessionStorage.setItem("session_expiry", expiryDate.toISOString())

      setUser(userData)
      setSessionExpiry(expiryDate)
      setUsername("")

      // Start session timer
      startSessionTimer(expiryDate)
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("sso_user")
    sessionStorage.removeItem("jwt_token")
    sessionStorage.removeItem("session_expiry")
    sessionStorage.removeItem("encrypted_payload")
    setUser(null)
    setSessionExpiry(null)
    setShowIframe(false)
    setError("")
  }

  const handleOpenAngularApp = async () => {
    if (!user) return

    if (!publicKey.trim()) {
      setError("Please provide a public key. You can generate one using the Key Generator page.")
      return
    }

    setLoading(true)
    try {
      const payloadObj = {
        userId: user.userId,
        username: user.username,
        timestamp: Date.now(),
      }
      const encryptedPayload = await encryptPayload(payloadObj, publicKey)

      // Make the handshake API request
      // const handshakeUrl = `https://dev.dfl.datanimbus.com/b2b/pipes/IL/digiCorpHandshakeToken?payload=${encodeURIComponent(encryptedPayload)}`
      const handshakeUrl = `https://dev.dfl.datanimbus.com/b2b/pipes/IL/digiCorpHandshakeToken?payload=${encryptedPayload}`
      const response = await fetch(handshakeUrl)
      if (!response.ok) throw new Error("Handshake API failed")

      const data = await response.json()

      // Save keys from response to sessionStorage
      sessionStorage.setItem("jwt_token", data.token || "")
      sessionStorage.setItem("encrypted_payload", encryptedPayload)

      // Set the Angular app URL with payload as query parameter
      const url = new URL(angularAppUrl)
      url.searchParams.set("payload", encryptedPayload)
      const iframeUrl = url.toString()

      setAngularAppUrl(iframeUrl)
      setShowIframe(true)
      setError("")
    } catch (err) {
      setError("Failed to encrypt payload or open platform. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function encryptPayload(payloadObj: { userId: string; username: string }, publicKey: string): Promise<string> {
    // Generate sessionId
    const sessionId = Math.random().toString(36).substring(2, 18)
    // Format requestDateTime as YYYYMMDD
    const now = new Date()
    const requestDateTime = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`

    // Construct hash value
    const hashInput = `${payloadObj.userId}${payloadObj.username}${sessionId}${requestDateTime}`
    const hashValue = SHA256(hashInput).toString()

    // Build payload
    const payload = {
      userId: payloadObj.userId,
      sessionId,
      requestDateTime,
      hashValue,
    }

    // Encrypt payload using public key
    const encrypt = new JSEncrypt()
    encrypt.setPublicKey(publicKey)
    const encrypted = encrypt.encrypt(JSON.stringify(payload))

    if (!encrypted) throw new Error("Encryption failed. Please check your public key.")

    return encrypted
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">SSO Mock Login</CardTitle>
            <CardDescription>Enter your username to access the application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SSO Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {user.username}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setShowIframe(!showIframe)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {showIframe ? "Hide App" : "Show App"}
              </Button>

              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Session Warning */}
      {sessionWarning && user && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-yellow-400 mr-3">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Your session will expire in {formatTime(timeRemaining)}
                  </p>
                  <p className="text-xs text-yellow-700">
                    Click "Extend Session" to continue or your session will automatically expire.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={refreshSession} className="ml-4 bg-transparent">
                Extend Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Username</Label>
                  <p className="text-lg font-semibold">{user.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">User ID</Label>
                  <p className="text-lg font-semibold">{user.userId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Angular App Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Ledgers Platform Configuration</CardTitle>
              <CardDescription>Configure your Angular application URL and encryption settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="angular-url">SCF Platform URL</Label>
                <Input
                  id="angular-url"
                  type="url"
                  placeholder="https://ledgers.demo.datanimbus.com/cx/parties"
                  value={angularAppUrl}
                  onChange={(e) => setAngularAppUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="public-key">Public Key for Encryption</Label>
                <textarea
                  id="public-key"
                  className="w-full h-32 p-3 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder="-----BEGIN PUBLIC KEY-----&#10;Your public key here&#10;-----END PUBLIC KEY-----"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
                {!publicKey.trim() && (
                  <Alert>
                    <AlertDescription>
                      <strong>No public key provided.</strong> Please visit the{" "}
                      <a href="/key-generator" className="text-blue-600 underline">
                        Key Generator
                      </a>{" "}
                      page to generate a valid RSA key pair for testing.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-gray-500">
                  This public key will be used to encrypt the payload before sending to SCF platform
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleOpenAngularApp}
                disabled={loading || !angularAppUrl || !publicKey.trim()}
                className="w-full"
              >
                {loading ? "Generating Encrypted Payload..." : "Open Ledgers Platform"}
              </Button>
            </CardContent>
          </Card>

          {/* Angular App iFrame */}
          {showIframe && (
            <Card>
              <CardHeader>
                <CardTitle>Ledgers Platform</CardTitle>
                <CardDescription>Your Angular app is running with SSO authentication at /cx/parties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={angularAppUrl}
                    className="w-full h-[600px] border-0"
                    title="Ledgers Platform - Parties"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  JWT Token is stored in sessionStorage and available to your Angular app. The encrypted payload is
                  passed as ?payload= query parameter.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Session Status:</span>
                  <span className="text-sm text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">JWT Token:</span>
                  <span className="text-sm text-gray-500">
                    {sessionStorage.getItem("jwt_token") ? "Available" : "Not generated"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Session Expires:</span>
                  <span className="text-sm text-gray-500">
                    {sessionExpiry ? sessionExpiry.toLocaleTimeString() : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Time Remaining:</span>
                  <span className={`text-sm ${timeRemaining < 60 ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                    {user ? formatTime(timeRemaining) : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
