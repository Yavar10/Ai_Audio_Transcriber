"use client";
import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client.js";
import { useRouter } from "next/navigation";
import { Upload, LogOut, FileAudio, FileText } from "lucide-react";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  if (isPending || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm uppercase tracking-widest text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#e2dfd8] px-8 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-normal italic serif-brand text-foreground">
          Atelier Transcribe
        </h1>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-sm uppercase tracking-widest text-gray-500 hover:text-foreground transition-colors"
        >
          <span>Logout</span>
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-16 space-y-16">
        
        {/* Upload Section */}
        <section className="space-y-6">
          <h2 className="text-xl serif-brand text-foreground">Initiate Transcription</h2>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border border-dashed border-[#e2dfd8] p-16 flex flex-col items-center justify-center text-center hover:bg-white/30 transition-colors relative cursor-pointer group">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload size={32} strokeWidth={1} className="text-gray-400 group-hover:text-[#2D334A] transition-colors mb-4" />
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : "Select an audio file"}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Maximum duration: 1 minute.
              </p>
            </div>
            
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!file || uploading}
                className="bg-[#2D334A] hover:bg-[#1a1f2e] text-white rounded-[4px] px-8 py-3 text-sm font-medium transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {uploading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <FileAudio size={16} strokeWidth={1.5} />
                    <span>Transcribe Audio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Transcripts List */}
        <section className="space-y-6">
          <h2 className="text-xl serif-brand text-foreground">Archive</h2>
          
          {loading ? (
            <p className="text-sm uppercase tracking-widest text-gray-400">Loading archive...</p>
          ) : transcripts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No transcriptions have been recorded yet.</p>
          ) : (
            <div className="border-t border-[#e2dfd8]">
              {transcripts.map((t) => (
                <article key={t.id} className="py-8 border-b border-[#e2dfd8] flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/4 shrink-0 space-y-1">
                    <p className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <FileText size={14} strokeWidth={1.5} />
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
                    <p className="text-sm leading-relaxed text-[#2D334A] whitespace-pre-wrap">
                      {t.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
