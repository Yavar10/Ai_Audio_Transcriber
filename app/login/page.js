"use client";
import { useState } from "react";
import { authClient } from "../../lib/auth-client.js";
import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-12 border border-[#e2dfd8] shadow-none bg-white/50 backdrop-blur-sm p-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-normal tracking-tight serif-brand">
            Atelier Transcribe
          </h2>
          <p className="text-sm text-gray-500 uppercase tracking-widest mt-2">
            Admin Access
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleLogin}>
          <div className="space-y-6">
            <div>
              <label className="sr-only" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full bg-transparent border-b border-[#e2dfd8] py-2 px-0 text-foreground placeholder:text-gray-400 focus:border-[#2D334A] outline-none rounded-none transition-colors sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full bg-transparent border-b border-[#e2dfd8] py-2 px-0 text-foreground placeholder:text-gray-400 focus:border-[#2D334A] outline-none rounded-none transition-colors sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D334A] hover:bg-[#1a1f2e] text-white rounded-[4px] px-4 py-3 text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
