import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth.js";
import { db } from "../../../lib/db/index.js";
import { transcript } from "../../../lib/db/schema.js";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userTranscripts = await db.select()
      .from(transcript)
      .where(eq(transcript.userId, session.user.id))
      .orderBy(desc(transcript.createdAt));

    return NextResponse.json({ transcripts: userTranscripts });
  } catch (error) {
    console.error("Fetch transcripts error:", error);
    return NextResponse.json({ error: "Failed to fetch transcripts" }, { status: 500 });
  }
}
