"use client";
import { AnimatePresence, motion } from "framer-motion";
import { FileAudio, FileText, Globe, LogOut, Mic, MicOff, Square, Star, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client.js";



const MAX_RECORDING_SECONDS = 60;

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [inputMode, setInputMode] = useState("upload"); // "upload" | "record"
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);

  // Refs for recorder
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchTranscripts();
    }
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transcripts");
      if (res.ok) {
        const data = await res.json();
        setTranscripts(data.transcripts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Transcription failed");
      } else {
        setFile(null);
        setAudioURL(null);
        fetchTranscripts();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  };

  // WAV encoder — writes a standard RIFF/PCM WAV header + 16-bit samples
  const encodeWAV = useCallback((samples, sampleRate) => {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buf);
    const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    str(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true);
    str(8, "WAVE"); str(12, "fmt "); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    str(36, "data"); view.setUint32(40, samples.length * 2, true);
    let off = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
    }
    return buf;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      const recordedSamples = [];

      processor.onaudioprocess = (e) => {
        recordedSamples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Store everything needed by stopRecording in the ref
      mediaRecorderRef.current = { audioCtx, source, processor, recordedSamples, sampleRate: audioCtx.sampleRate, stream };

      setIsRecording(true);
      setRecordingTime(0);
      setAudioURL(null);
      setFile(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);

    const rec = mediaRecorderRef.current;
    if (!rec || !rec.audioCtx) return;

    rec.source.disconnect();
    rec.processor.disconnect();
    rec.audioCtx.close();
    rec.stream.getTracks().forEach(t => t.stop());

    // Flatten sample chunks
    const total = rec.recordedSamples.reduce((n, a) => n + a.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const chunk of rec.recordedSamples) { merged.set(chunk, off); off += chunk.length; }

    const wavBuf = encodeWAV(merged, rec.sampleRate);
    const blob = new Blob([wavBuf], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    setAudioURL(url);
    setFile(new File([blob], `recording-${Date.now()}.wav`, { type: "audio/wav" }));
  }, [encodeWAV]);

  const resetRecording = useCallback(() => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setFile(null);
    setRecordingTime(0);
  }, [audioURL]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 12 }
    }
  };

  if (isPending || !session) {
    return (
      <motion.div
        className="flex min-h-screen items-center justify-center text-sm uppercase tracking-widest text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.span>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated background blobs */}
      <motion.div
        className="fixed top-20 left-10 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-20 right-10 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed top-1/2 left-1/2 w-48 h-48 bg-pink-200/20 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.header
        className="border-b border-[#e2dfd8] px-8 py-6 flex items-center justify-between relative z-10"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.h1
          className="text-2xl font-normal italic serif-brand text-foreground flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Star size={20} className="text-foreground/60" />
          </motion.span>
          Atelier Transcribe
        </motion.h1>
        <motion.button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-sm uppercase tracking-widest text-gray-500 hover:text-foreground transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>Logout</span>
          <LogOut size={16} strokeWidth={1.5} />
        </motion.button>
      </motion.header>

      <main className="mx-auto max-w-5xl px-8 py-16 space-y-16 relative z-10">

        {/* Upload / Record Section */}
        <motion.section
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 className="text-xl serif-brand text-foreground flex items-center gap-2" variants={itemVariants}>
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
              <Star size={20} className="text-foreground/60" />
            </motion.span>
            Initiate Transcription
          </motion.h2>

          {/* Mode Tabs */}
          <motion.div className="flex gap-0 border-b border-[#e2dfd8]" variants={itemVariants}>
            <button
              onClick={() => { setInputMode("upload"); resetRecording(); }}
              className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-widest transition-all relative ${
                inputMode === "upload"
                  ? "text-[#2D334A] font-semibold"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Upload size={14} strokeWidth={1.5} />
              Upload File
              {inputMode === "upload" && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2D334A]"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => { setInputMode("record"); setFile(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-widest transition-all relative ${
                inputMode === "record"
                  ? "text-[#2D334A] font-semibold"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Mic size={14} strokeWidth={1.5} />
              Record Audio
              {inputMode === "record" && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2D334A]"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          </motion.div>

          <form onSubmit={handleUpload} className="space-y-5">
            <AnimatePresence mode="wait">
              {inputMode === "upload" ? (
                /* ── Upload Drop Zone ── */
                <motion.div
                  key="upload-zone"
                  className={`border-2 border-dashed border-[#e2dfd8] p-16 flex flex-col items-center justify-center text-center relative cursor-pointer group overflow-hidden ${isDragging ? 'border-[#2D334A] bg-blue-50/50' : 'hover:bg-white/30'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && droppedFile.type.startsWith('audio/')) {
                      setFile(droppedFile);
                    }
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  <AnimatePresence>
                    {isDragging && (
                      <motion.div
                        className="absolute inset-0 border-2 border-blue-400 rounded-lg"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 1 }}
                        exit={{ scale: 1.2, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={{
                      y: file ? [0, -5, 0] : [0, 5, 0],
                      scale: file ? 1.2 : 1
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Upload size={32} strokeWidth={1} className={`text-gray-400 group-hover:text-[#2D334A] transition-colors mb-4 ${file ? 'text-green-500' : ''}`} />
                  </motion.div>

                  <motion.p
                    className="text-sm font-medium text-foreground"
                    key={file ? file.name : "empty"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {file ? file.name : "Select an audio file"}
                  </motion.p>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum duration: 1 minute.
                  </p>

                  {file && (
                    <motion.div
                      className="mt-4 flex items-center gap-2 text-green-600 text-xs"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                        <FileAudio size={12} />
                      </motion.span>
                      File ready!
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                /* ── Record Audio Zone ── */
                <motion.div
                  key="record-zone"
                  className="border-2 border-dashed border-[#e2dfd8] p-16 flex flex-col items-center justify-center text-center relative overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {!isRecording && !audioURL && (
                    /* Idle state */
                    <motion.div
                      className="flex flex-col items-center gap-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.button
                        type="button"
                        onClick={startRecording}
                        className="w-20 h-20 rounded-full bg-[#2D334A] flex items-center justify-center text-white hover:bg-[#1a1f2e] transition-colors"
                        whileHover={{ scale: 1.1, boxShadow: "0 0 30px rgba(45, 51, 74, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Mic size={28} strokeWidth={1.5} />
                      </motion.button>
                      <p className="text-sm text-gray-500">Click to start recording</p>
                      <p className="text-xs text-gray-400">Maximum duration: 1 minute.</p>
                    </motion.div>
                  )}

                  {isRecording && (
                    /* Recording state */
                    <motion.div
                      className="flex flex-col items-center gap-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {/* Pulsing rings */}
                      <div className="relative">
                        <motion.div
                          className="absolute inset-0 w-20 h-20 rounded-full bg-red-400/20"
                          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{ margin: "0px" }}
                        />
                        <motion.div
                          className="absolute inset-0 w-20 h-20 rounded-full bg-red-400/15"
                          animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                          style={{ margin: "0px" }}
                        />
                        <motion.button
                          type="button"
                          onClick={stopRecording}
                          className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors z-10"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Square size={22} strokeWidth={2} fill="white" />
                        </motion.button>
                      </div>

                      <div className="flex flex-col items-center gap-1 mt-2">
                        <motion.p
                          className="text-2xl font-light text-[#2D334A] tabular-nums tracking-wider"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {formatTime(recordingTime)}
                        </motion.p>
                        <p className="text-xs uppercase tracking-widest text-red-500 font-medium flex items-center gap-1.5">
                          <motion.span
                            className="inline-block w-2 h-2 rounded-full bg-red-500"
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                          Recording
                        </p>
                      </div>

                      {/* Time progress bar */}
                      <div className="w-48 h-1 bg-[#e2dfd8] rounded-full overflow-hidden mt-1">
                        <motion.div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${(recordingTime / MAX_RECORDING_SECONDS) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {!isRecording && audioURL && (
                    /* Recorded / Preview state */
                    <motion.div
                      className="flex flex-col items-center gap-4 w-full max-w-sm"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                        <FileAudio size={24} className="text-green-600" />
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Recording complete</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(recordingTime)} captured</p>
                      </div>

                      <audio
                        src={audioURL}
                        controls
                        className="w-full h-10 mt-1"
                        style={{ filter: "sepia(0.15)" }}
                      />

                      <motion.button
                        type="button"
                        onClick={resetRecording}
                        className="text-xs uppercase tracking-widest text-gray-500 hover:text-[#2D334A] transition-colors flex items-center gap-1.5 mt-1"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <MicOff size={12} strokeWidth={1.5} />
                        Re-record
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>



            <AnimatePresence>
              {error && (
                <motion.p
                  className="text-sm text-red-600 font-medium"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div className="flex justify-end" variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={!file || uploading}
                className="bg-[#2D334A] hover:bg-[#1a1f2e] text-white rounded-[4px] px-8 py-3 text-sm font-medium transition-all disabled:opacity-50 flex items-center space-x-2"
                whileHover={file && !uploading ? { scale: 1.05, boxShadow: "0 4px 20px rgba(45, 51, 74, 0.4)" } : {}}
                whileTap={file && !uploading ? { scale: 0.95 } : {}}
              >
                {uploading ? (
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.span
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Processing...
                    </motion.span>
                  </div>
                ) : (
                  <>
                    <FileAudio size={16} strokeWidth={1.5} />
                    <span>Transcribe Audio</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.section>

        {/* Transcripts List */}
        <motion.section
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 className="text-xl serif-brand text-foreground" variants={itemVariants}>
            Archive
          </motion.h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <motion.div
                className="w-8 h-8 border-2 border-gray-100 border-t-[#2D334A] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <motion.p
                className="text-xs uppercase tracking-[0.2em] text-gray-400 font-medium"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Syncing Archives
              </motion.p>
            </div>
          ) : transcripts.length === 0 ? (
            <motion.p
              className="text-sm text-gray-500 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              No transcriptions have been recorded yet.
            </motion.p>
          ) : (
            <motion.div
              className="border-t border-[#e2dfd8]"
              variants={containerVariants}
            >
              <AnimatePresence>
                {transcripts.map((t, index) => (
                  <motion.article
                    key={t.id}
                    className="py-8 border-b border-[#e2dfd8] flex flex-col md:flex-row gap-8 hover:bg-white/30 transition-colors cursor-default"
                    variants={itemVariants}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.3)" }}
                  >
                    <div className="md:w-1/4 shrink-0 space-y-1">
                      <p className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <motion.span whileHover={{ rotate: 360, scale: 1.2 }}>
                          <FileText size={14} strokeWidth={1.5} />
                        </motion.span>
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="md:w-3/4">
                      <motion.p
                        className="text-sm leading-relaxed text-[#2D334A] whitespace-pre-wrap"
                        initial={{ opacity: 0.8 }}
                        whileHover={{ opacity: 1 }}
                      >
                        {t.text}
                      </motion.p>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.section>

      </main>
    </div>
  );
}
