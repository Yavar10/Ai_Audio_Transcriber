"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../../lib/auth-client.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setError(error.message || "Login failed");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbf9f4] p-4">
      <div className="w-full max-w-md border border-[#e2dfd8] bg-white/80 shadow-none backdrop-blur-sm rounded-xl p-10 flex flex-col">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-normal tracking-tight serif-brand mb-1">Atelier Transcribe</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Admin Panel Access</p>
        </div>
        <form className="space-y-8" onSubmit={handleLogin}>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[#2D334A] mb-1 tracking-widest">USERNAME</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full bg-transparent border-b border-[#e2dfd8] py-2 px-0 text-[#2D334A] placeholder:text-gray-400 focus:border-[#2D334A] outline-none rounded-none transition-colors text-base"
                placeholder="admin@atelier.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2D334A] mb-1 tracking-widest">PASSWORD</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full bg-transparent border-b border-[#e2dfd8] py-2 px-0 text-[#2D334A] placeholder:text-gray-400 focus:border-[#2D334A] outline-none rounded-none transition-colors text-base"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 font-medium mt-2">{error}</p>}
          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#23293A] hover:bg-[#151a28] text-white rounded-md px-4 py-3 text-base font-semibold transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? "Authenticating..." : "Enter Administrative Hub"}
            </button>
          </div>
        </form>
        {/* <div className="flex items-center justify-between text-xs text-[#23293A] mt-6 mb-2">
          <a href="#" className="hover:underline">Forgot credentials?</a>
          <span className="mx-2 text-gray-300">—</span>
          <a href="#" className="hover:underline">System Status</a>
        </div> */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[#e2dfd8]">
          <div className="w-10 h-10 bg-[#e2dfd8] rounded-lg flex items-center justify-center">
            {/* Placeholder for logo/icon */}
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#bcbcbc" /></svg>
          </div>
          <div className="text-xs text-[#23293A]/80 italic">
            "Precision is the soul of every narrative."<br />
            <span className="not-italic text-[10px] tracking-wide">FOUNDRY ARCHIVES — 1924</span>
          </div>
        </div>
      </div>
    </div>
  );
}
