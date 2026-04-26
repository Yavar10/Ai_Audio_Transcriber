export const runtime = "nodejs";

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { NextResponse } from "next/server";
import os from "os";
import path from "path";
import { auth } from "../../../lib/auth.js";
import { db } from "../../../lib/db/index.js";
import { transcript } from "../../../lib/db/schema.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  let tempFilePath = null;

  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers)
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio");

    // Defensive logging
    console.log("Debug: File type received:", file?.type);

    if (!file || typeof file?.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 1. Determine standard MIME type for Gemini
    let rawType = file.type || "audio/webm";
    let mimeType = rawType.split(";")[0].trim().toLowerCase();

    // Mapping non-standard types to Gemini-supported types
    const mimeMap = {
      "audio/x-m4a": "audio/aac",
      "audio/m4a": "audio/aac",
      "audio/x-alac": "audio/aac",
      "audio/mp4": "audio/aac",
      "audio/mpeg": "audio/mp3"
    };

    if (mimeMap[mimeType]) {
      console.log(`Debug: Mapping ${mimeType} to ${mimeMap[mimeType]} for Gemini stability`);
      mimeType = mimeMap[mimeType];
    }

    // 2. Prepare safe filename and extension
    const ext = mimeType.split("/")[1] || "webm";
    const safeName = file.name || `audio-${Date.now()}.${ext}`;

    // 3. Process buffer and temp file
    const buffer = Buffer.from(await file.arrayBuffer());
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);
    fs.writeFileSync(tempFilePath, buffer);

    // 4. Upload to Gemini with forced supported mimeType
    console.log("Debug: Uploading file to Gemini", { tempFilePath, mimeType });
    
    let uploadedFile;
    try {
      uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: mimeType,
        },
      });
    } catch (uploadError) {
      console.error("Gemini upload error:", uploadError);
      // Check if file exists
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temp file not found: ${tempFilePath}`);
      }
      // Re-throw with more context
      throw new Error(`Gemini upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
    }
    
    console.log("Debug: File uploaded successfully", uploadedFile);

    // Clean up temp file immediately after upload
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;
    }

    // 5. Poll until the file is active (max 10 attempts)
    let attempts = 0;
    while (uploadedFile.state === "PROCESSING" && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      uploadedFile = await ai.files.get({ name: uploadedFile.name });
      attempts++;
    }

    if (uploadedFile.state === "FAILED") {
      throw new Error("Audio file processing failed on Gemini.");
    }

    // 6. Request transcription
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: uploadedFile.uri, mimeType: mimeType } },
            { text: "Please transcribe this audio. Return only the transcription text." }
          ],
        },
      ],
    });

    const transcribedText = response.text || "No transcription";

    // 7. Save to DB
    const [newTranscript] = await db.insert(transcript).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      text: transcribedText,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({ success: true, transcript: newTranscript });
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Final cleanup
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    
    const errorMessage = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
