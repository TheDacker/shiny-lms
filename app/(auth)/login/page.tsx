"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";
import ShellLogo from "@/components/ShellLogo";

// Separated so useSearchParams is inside a Suspense boundary
function SearchParamsError({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) onError(urlError);
  }, [searchParams, onError]);
  return null;
}

export default function LoginPage() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    const trimmed = value.trim();
    setLoading(true);
    const supabase = createClient();

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (otpError) {
        setError(
          otpError.message.toLowerCase().includes("rate limit")
            ? "Too many requests. Please wait a few minutes."
            : otpError.message
        );
        return;
      }

      setEmailSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="bg-(--color-white) rounded-2xl shadow-sm p-8 space-y-5 text-center">
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(31,57,109,0.08)" }}
        >
          <Mail size={26} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h2
            className="text-xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Check your email
          </h2>
          <p className="text-sm mt-2" style={{ color: "rgba(31,57,109,0.6)" }}>
            We sent a sign-in link to <strong>{value}</strong>.<br />
            Click the link in the email to log in.
          </p>
        </div>
        <button
          onClick={() => { setEmailSent(false); setValue(""); }}
          className="text-sm font-medium"
          style={{ color: "rgba(31,57,109,0.5)" }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-(--color-white) rounded-2xl shadow-sm p-8 space-y-6">
      <Suspense fallback={null}>
        <SearchParamsError onError={setError} />
      </Suspense>

      {/* Logo */}
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded mb-2"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          <ShellLogo size={34} />
        </div>
        <h1
          className="text-2xl font-bold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Shiny Shell LMS
        </h1>
        <p className="text-sm" style={{ color: "var(--color-primary)", opacity: 0.6 }}>
          Sign in to your account
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="identifier"
            className="block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Email address
          </label>
          <input
            id="identifier"
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)}
            placeholder="you@shinyshell.com"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors"
            style={{
              borderColor: "rgba(31,57,109,0.2)",
              color: "var(--color-primary)",
              backgroundColor: "var(--color-white)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(31,57,109,0.2)")}
          />
        </div>

        {error && (
          <p className="text-sm font-medium p-3 rounded-lg" style={{ color: "var(--color-error)", backgroundColor: "rgba(201,59,59,0.07)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded text-sm font-bold uppercase tracking-wider text-white transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-accent)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {loading ? "Sending…" : "Send Link"}
        </button>
      </div>
    </div>
  );
}
