import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth.js";
import { db } from "../../../lib/db/index.js";
import { transcript } from "../../../lib/db/schema.js";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";
import os from "os";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const prompt = "Please transcribe this audio. Return only the transcription text.";

    // Convert file to buffer and save it temporarily
    // file.name can be undefined when the blob comes from MediaRecorder, so derive a safe fallback
    const ext = file.type.includes("ogg") ? "ogg"
      : file.type.includes("mp4") ? "mp4"
      : file.type.includes("wav") ? "wav"
      : file.type.includes("flac") ? "flac"
      : "webm";
    const safeName = (file.name && file.name !== "undefined") ? file.name : `audio-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);
    fs.writeFileSync(tempFilePath, buffer);

    // Upload to Gemini — strip codec params (e.g. "audio/webm;codecs=opus" → "audio/webm")
    // Gemini Files API only accepts the base MIME type
    const mimeType = (file.type || "audio/webm").split(";")[0].trim();
    let uploadedFile = await ai.files.upload({
      file: tempFilePath,
      mimeType,
    });

    // Clean up temp file immediately after upload
    fs.unlinkSync(tempFilePath);

    // Poll until the file is active
    while (uploadedFile.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      uploadedFile = await ai.files.get({ name: uploadedFile.name });
    }

    if (uploadedFile.state === "FAILED") {
      throw new Error("Audio file processing failed on Gemini.");
    }

    // Request transcription
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: uploadedFile.uri, mimeType } },
            { text: prompt }
          ],
        },
      ],
    });

    const transcribedText = response.text;

    // Save to DB
    const [newTranscript] = await db.insert(transcript).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      text: transcribedText,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({ success: true, transcript: newTranscript });
  } catch (error) {
    console.error("Transcription error:", error);
    const errorMessage = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
