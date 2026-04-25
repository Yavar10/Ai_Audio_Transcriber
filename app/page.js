"use client";
import { AnimatePresence, motion } from "framer-motion";
import { FileAudio, FileText, LogOut, Star, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client.js";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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
        fetchTranscripts();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
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

  const floatVariants = {
    animate: {
      y: [0, -10, 0],
      rotate: [0, 5, -5, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: { duration: 2, repeat: Infinity }
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
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="fixed bottom-20 right-10 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl pointer-events-none"
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="fixed top-1/2 left-1/2 w-48 h-48 bg-pink-200/20 rounded-full blur-3xl pointer-events-none"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
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
        
        {/* Upload Section */}
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
          
          <form onSubmit={handleUpload} className="space-y-4">
            <motion.div 
              className={`border-2 border-dashed border-[#e2dfd8] p-16 flex flex-col items-center justify-center text-center relative cursor-pointer group overflow-hidden ${isDragging ? 'border-[#2D334A] bg-blue-50/50' : 'hover:bg-white/30'}`}
              variants={itemVariants}
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
              
              {/* Animated rings when dragging */}
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
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Processing...
                  </motion.span>
                ) : (
                  <>
                    <motion.span
                      animate={file ? { rotate: [0, 360] } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <FileAudio size={16} strokeWidth={1.5} />
                    </motion.span>
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
            <motion.p 
              className="text-sm uppercase tracking-widest text-gray-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading archive...
            </motion.p>
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
