import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// This endpoint simulates what your SCF platform would do to decrypt the payload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { encryptedPayload, privateKey } = body

    if (!encryptedPayload || !privateKey) {
      return NextResponse.json({ error: "Missing encrypted payload or private key" }, { status: 400 })
    }

    // Decrypt the payload using RSA private key
    const decryptedBuffer = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedPayload, "base64"),
    )

    const decryptedPayload = decryptedBuffer.toString("utf8")
    const payload = JSON.parse(decryptedPayload)

    // Verify the hash
    const hashString = `${payload.userId}${payload.userName}${payload.sessionId}${payload.requestDateTime}`
    const expectedHash = crypto.createHash("sha256").update(hashString, "utf8").digest("hex")

    const isHashValid = payload.hashValue === expectedHash

    return NextResponse.json({
      success: true,
      payload,
      hashValid: isHashValid,
      message: isHashValid
        ? "Payload decrypted and hash verified successfully"
        : "Payload decrypted but hash verification failed",
    })
  } catch (error) {
    console.error("Decryption error:", error)
    return NextResponse.json(
      {
        error: "Failed to decrypt payload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
