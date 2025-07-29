"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Key, Download } from "lucide-react"

export default function KeyGeneratorPage() {
  const [keyPair, setKeyPair] = useState<{ publicKey: string; privateKey: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<"public" | "private" | null>(null)

  const generateKeyPair = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/generate-keys", {
        method: "POST",
      })
      const data = await response.json()
      setKeyPair(data)
    } catch (error) {
      console.error("Failed to generate keys:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: "public" | "private") => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const downloadKey = (key: string, filename: string) => {
    const blob = new Blob([key], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>RSA Key Pair Generator</span>
            </CardTitle>
            <CardDescription>
              Generate RSA public/private key pairs for testing the SSO handshake encryption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateKeyPair} disabled={loading} className="w-full">
              {loading ? "Generating Keys..." : "Generate New Key Pair"}
            </Button>
          </CardContent>
        </Card>

        {keyPair && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Public Key</CardTitle>
                <CardDescription>
                  Use this key in the SSO mock application for encryption. Share this with DigiCorp team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">{keyPair.publicKey}</pre>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(keyPair.publicKey, "public")}>
                    <Copy className="h-4 w-4 mr-2" />
                    {copied === "public" ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadKey(keyPair.publicKey, "public_key.pem")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Private Key</CardTitle>
                <CardDescription>
                  Keep this key secure! Use this in your SCF platform to decrypt the payload.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Security Warning:</strong> Never share your private key. Store it securely in your SCF
                    platform.
                  </AlertDescription>
                </Alert>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">{keyPair.privateKey}</pre>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(keyPair.privateKey, "private")}>
                    <Copy className="h-4 w-4 mr-2" />
                    {copied === "private" ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadKey(keyPair.privateKey, "private_key.pem")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none space-y-4">
                  <div>
                    <h4 className="font-semibold">For DigiCorp Team (SSO Provider):</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>
                        Use the <strong>public key</strong> to encrypt the payload
                      </li>
                      <li>
                        Send the encrypted payload as a query parameter: <code>?payload=encrypted_data</code>
                      </li>
                      <li>The payload should contain: userId, userName, sessionId, requestDateTime, hashValue</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold">For SCF Platform Team:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>
                        Store the <strong>private key</strong> securely in your environment
                      </li>
                      <li>Use the private key to decrypt incoming payloads</li>
                      <li>Verify the SHA256 hash to ensure payload integrity</li>
                      <li>Generate and return JWT token for authenticated sessions</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
