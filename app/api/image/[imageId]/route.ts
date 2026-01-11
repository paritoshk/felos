import { NextRequest, NextResponse } from "next/server";
import { getImage } from "@/lib/imageStore";

// Get image by ID and session
export async function GET(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { imageId } = params;
    const sessionId = request.nextUrl.searchParams.get("session");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const imageKey = `${sessionId}:${imageId}`;
    const base64Data = getImage(imageKey);

    if (!base64Data) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64 = base64Data.includes(",") 
      ? base64Data.split(",")[1] 
      : base64Data;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64, "base64");

    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}

