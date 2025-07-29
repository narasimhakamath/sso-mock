import { type NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import crypto from "crypto"

// Generate SHA256 hash
function generateSHA256Hash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex")
}

// Encrypt payload using RSA public key
function encryptWithPublicKey(data: string, publicKey: string): string {
  try {
    // Clean and validate the public key format
    const cleanKey = publicKey.trim()

    // Check if key has proper headers
    if (!cleanKey.includes("-----BEGIN PUBLIC KEY-----")) {
      throw new Error("Invalid public key format - missing BEGIN header")
    }

    if (!cleanKey.includes("-----END PUBLIC KEY-----")) {
      throw new Error("Invalid public key format - missing END header")
    }

    const buffer = Buffer.from(data, "utf8")
    const encrypted = crypto.publicEncrypt(
      {
        key: cleanKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer,
    )
    return encrypted.toString("base64")
  } catch (error) {
    console.error("Encryption error:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to encrypt payload: ${error.message}`)
    }
    throw new Error("Failed to encrypt payload: Unknown error")
  }
}

// Mock JWT secret (use environment variable in production)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-super-secret-jwt-key-here")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, username, publicKey } = body

    if (!userId || !username || !publicKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate public key format before proceeding
    if (!publicKey.includes("-----BEGIN PUBLIC KEY-----") || !publicKey.includes("-----END PUBLIC KEY-----")) {
      return NextResponse.json(
        {
          error: "Invalid public key format. Please ensure it includes proper BEGIN/END headers.",
        },
        { status: 400 },
      )
    }

    // Generate session ID and request date time
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const requestDateTime = new Date().toISOString()

    // Create the string for hash generation (as per your specification)
    const hashString = `${userId}${username}${sessionId}${requestDateTime}`
    const hashValue = generateSHA256Hash(hashString)

    // Create the payload object
    const payload = {
      userId,
      userName: username,
      sessionId,
      requestDateTime,
      hashValue,
    }

    // Convert payload to JSON string for encryption
    const payloadString = JSON.stringify(payload)

    // Encrypt the payload using the provided public key
    const encryptedPayload = encryptWithPublicKey(payloadString, publicKey)

    // Generate JWT token for the session
    const token = await new SignJWT({
      sub: userId,
      username: username,
      sessionId: sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(JWT_SECRET)

    // Return the response
    return NextResponse.json({
      success: true,
      token,
      encryptedPayload,
      sessionId,
      requestDateTime,
      message: "Handshake successful - payload encrypted and ready for SCF platform",
      // Include unencrypted payload for debugging (remove in production)
      debug: {
        originalPayload: payload,
        hashString: hashString,
        payloadString: payloadString,
      },
    })
  } catch (error) {
    console.error("Handshake API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET endpoint to simulate the actual handshake call with query parameter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payload = searchParams.get("payload")

    if (!payload) {
      return NextResponse.json({ error: "Missing payload parameter" }, { status: 400 })
    }

    // In a real scenario, you would decrypt the payload here using your private key
    // For this mock, we'll just return a success response with a JWT token

    // Generate a mock JWT token
    const token = await new SignJWT({
      sub: "decrypted_user_id",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(JWT_SECRET)

    return NextResponse.json({
      success: true,
      token,
      message: "Payload received and processed successfully",
      receivedPayload: payload.substring(0, 100) + "...", // Show first 100 chars for debugging
    })
  } catch (error) {
    console.error("Handshake GET API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
