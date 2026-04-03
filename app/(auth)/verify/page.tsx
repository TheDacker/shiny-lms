"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase sends 6-digit OTP by default.
// To use 4 digits: Supabase Dashboard → Authentication → Settings → OTP length.
const OTP_LENGTH = 6;

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const method = (params.get("method") ?? "email") as "email" | "sms";
  const identifier = params.get("identifier") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, val: string) {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = [...digits];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length < OTP_LENGTH) return;

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp(
      method === "email"
        ? { email: identifier, token, type: "email" }
        : { phone: identifier, token, type: "sms" }
    );

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      return;
    }

    router.push("/");
  }

  async function handleResend() {
    const supabase = createClient();
    method === "email"
      ? await supabase.auth.signInWithOtp({ email: identifier })
      : await supabase.auth.signInWithOtp({ phone: identifier });
    setDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    inputRefs.current[0]?.focus();
  }

  const maskedIdentifier =
    method === "email"
      ? identifier.replace(/(.{2}).+(@.+)/, "$1•••$2")
      : identifier.slice(-4).padStart(identifier.length, "•");

  return (
    <div className="bg-(--color-white) rounded-2xl shadow-sm p-8 space-y-6">
      <div className="text-center space-y-1">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <span className="text-white font-bold text-lg">SS</span>
        </div>
        <h1
          className="text-2xl font-bold tracking-wide uppercase"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Enter your code
        </h1>
        <p className="text-sm" style={{ color: "var(--color-primary)", opacity: 0.6 }}>
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="font-medium">{maskedIdentifier}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-14 text-center text-xl font-bold rounded-lg border outline-none transition-colors"
              style={{
                borderColor: d ? "var(--color-accent)" : "rgba(31,57,109,0.2)",
                color: "var(--color-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) =>
                (e.target.style.borderColor = d
                  ? "var(--color-accent)"
                  : "rgba(31,57,109,0.2)")
              }
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || digits.join("").length < OTP_LENGTH}
          className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider text-white transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-accent)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          className="text-sm underline"
          style={{ color: "var(--color-primary)", opacity: 0.6 }}
        >
          Resend code
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-(--color-white) rounded-2xl shadow-sm p-8 text-center">
          <p className="text-sm" style={{ color: "var(--color-primary)", opacity: 0.6 }}>
            Loading…
          </p>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
