"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Label } from "@/components/ui/label"

export default function TestAngularPage() {
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [encryptedPayload, setEncryptedPayload] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState("")
  const [decryptedPayload, setDecryptedPayload] = useState<any>(null)
  const [decryptLoading, setDecryptLoading] = useState(false)

  useEffect(() => {
    // Get JWT token from session storage
    const token = sessionStorage.getItem("token")
    const payload = sessionStorage.getItem("encrypted_payload")
    setJwtToken(token)
    setEncryptedPayload(payload)

    if (token) {
      verifyToken(token)
    }
  }, [])

  const verifyToken = async (token: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      setTokenValid(data.valid)
    } catch (error) {
      setTokenValid(false)
    } finally {
      setLoading(false)
    }
  }

  const refreshToken = () => {
    const token = sessionStorage.getItem("token")
    setJwtToken(token)
    if (token) {
      verifyToken(token)
    }
  }

  const decryptPayload = async () => {
    if (!encryptedPayload || !privateKey.trim()) return

    setDecryptLoading(true)
    try {
      const response = await fetch("/api/decrypt-payload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encryptedPayload,
          privateKey: privateKey.trim(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setDecryptedPayload(data)
      } else {
        setDecryptedPayload({ error: data.error })
      }
    } catch (error) {
      setDecryptedPayload({ error: "Failed to decrypt payload" })
    } finally {
      setDecryptLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ledgers Platform Test Page</CardTitle>
            <CardDescription>
              This page simulates how your Angular app at /cx/parties would access the JWT token from session storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">JWT Token Status</h3>
              <Button variant="outline" size="sm" onClick={refreshToken}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {jwtToken ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>JWT Token found in session storage</AlertDescription>
                </Alert>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Token (truncated):</p>
                  <code className="text-xs bg-white p-2 rounded block overflow-hidden">
                    {jwtToken.substring(0, 100)}...
                  </code>
                </div>

                {tokenValid !== null && (
                  <Alert variant={tokenValid ? "default" : "destructive"}>
                    {tokenValid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <AlertDescription>Token is {tokenValid ? "valid" : "invalid"}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>No JWT token found. Please login through the SSO portal first.</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verifying token...</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encrypted Payload Testing</CardTitle>
            <CardDescription>
              Test payload decryption using your private key (simulates SCF platform behavior)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {encryptedPayload ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>Encrypted payload found in session storage</AlertDescription>
                </Alert>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Encrypted Payload (truncated):</p>
                  <code className="text-xs bg-white p-2 rounded block overflow-hidden">
                    {encryptedPayload.substring(0, 200)}...
                  </code>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="private-key">Private Key (for decryption testing)</Label>
                  <textarea
                    id="private-key"
                    className="w-full h-32 p-3 border border-gray-300 rounded-md text-sm font-mono"
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;Your private key here&#10;-----END PRIVATE KEY-----"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                  />
                </div>

                <Button onClick={decryptPayload} disabled={decryptLoading || !privateKey.trim()} className="w-full">
                  {decryptLoading ? "Decrypting..." : "Decrypt Payload"}
                </Button>

                {decryptedPayload && (
                  <div className="space-y-2">
                    {decryptedPayload.error ? (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{decryptedPayload.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2">
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Payload decrypted successfully! Hash verification:{" "}
                            {decryptedPayload.hashValid ? "✅ Valid" : "❌ Invalid"}
                          </AlertDescription>
                        </Alert>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Decrypted Payload:</p>
                          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(decryptedPayload.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  No encrypted payload found. Please generate one through the SSO portal first.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h4>For your Angular application at /cx/parties:</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>Check for JWT token in sessionStorage on app initialization</li>
                <li>Check for encrypted payload in URL query parameter: ?payload=</li>
                <li>If both exist, validate the token with your backend</li>
                <li>Decrypt the payload using your private key to get user information</li>
                <li>If valid, skip the login page and proceed to the parties view</li>
                <li>If invalid or missing, show the login page</li>
              </ol>

              <h4 className="mt-6">Example Angular code for /cx/parties:</h4>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                {`// In your Angular service
checkSSOToken(): boolean {
  const token = sessionStorage.getItem('token');
  const urlParams = new URLSearchParams(window.location.search);
  const payload = urlParams.get('payload');
  
  if (token && payload) {
    // Validate token and decrypt payload with your backend
    return this.validateSSOSession(token, payload);
  }
  return false;
}

// In your parties component or guard
ngOnInit() {
  if (this.authService.checkSSOToken()) {
    // User is authenticated via SSO, load parties data
    this.loadPartiesData();
  } else {
    // Redirect to login page
    this.router.navigate(['/login']);
  }
}

// Method to handle SSO payload
private async validateSSOSession(token: string, encryptedPayload: string) {
  try {
    const response = await this.http.post('/api/validate-sso', {
      token,
      payload: encryptedPayload
    }).toPromise();
    
    if (response.valid) {
      // Store user info and proceed
      this.userService.setCurrentUser(response.user);
      return true;
    }
  } catch (error) {
    console.error('SSO validation failed:', error);
  }
  return false;
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
