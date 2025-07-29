import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST() {
  try {
    // Generate RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    })

    return NextResponse.json({
      publicKey,
      privateKey,
      message: "RSA key pair generated successfully",
    })
  } catch (error) {
    console.error("Key generation error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate key pair",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
