import { NextRequest, NextResponse } from "next/server";
import { storage, bucketName } from "../../../lib/google";

function parseGcsUri(uri: string) {
  const prefix = `gs://${bucketName}/`;

  if (!uri.startsWith(prefix)) {
    throw new Error("Invalid AskSAV evidence URI");
  }

  return uri.substring(prefix.length);
}

export async function GET(request: NextRequest) {
  try {
    const uri = request.nextUrl.searchParams.get("uri");

    if (!uri) {
      return NextResponse.json(
        { error: "Missing uri" },
        { status: 400 }
      );
    }

    const objectPath = parseGcsUri(uri);

    const file = storage
      .bucket(bucketName)
      .file(objectPath);

    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          metadata.contentType || "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[AskSAV] Evidence image proxy error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load evidence image",
      },
      { status: 500 }
    );
  }
}

