import { type NextRequest, NextResponse } from "next/server"

// This endpoint simulates your backend calling to refresh the session
// Your backend would call this endpoint to keep the session alive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, sessionId, apiKey } = body

    // Validate API key (in production, use proper authentication)
    if (apiKey !== "your-backend-api-key") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!userId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Simulate session refresh logic
    // In production, this would update your session store
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000) // Extend by 5 minutes

    // Log the server-to-server refresh (for testing purposes)
    console.log(`Server-to-server session refresh for user ${userId}, session ${sessionId}`)

    return NextResponse.json({
      success: true,
      userId,
      sessionId,
      expiresAt: newExpiresAt.toISOString(),
      message: "Session refreshed via server-to-server call",
      refreshedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Server-to-server refresh error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
