import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

const C = {
  bg:            "#0a0b0d",
  bgCard:        "#11131a",
  bgDeep:        "#0d0f14",
  gold:          "#c9a84c",
  goldDim:       "#8a6e30",
  goldBorder:    "rgba(201,168,76,0.35)",
  goldBorderDim: "rgba(201,168,76,0.12)",
  parchment:     "#e8dfc8",
  parchmentDim:  "#a89d88",
  green:         "#4ca87c",
  red:           "#c94c4c",
};

export default function AuthModal({ message, onDismiss }) {
  const router = useRouter();
  const [mode, setMode]         = useState("signin"); // signin | signup | forgot | sent
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !email.includes("@")) { setError("Enter a valid email address."); return; }

    if (mode === "forgot") {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setMode("sent");
      return;
    }

    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);

      if (error) {
        let friendlyMessage = '';
        const msg = error.message?.toLowerCase() || '';

        if (msg.includes('already registered') || msg.includes('user already exists')) {
          friendlyMessage = 'An account with this email already exists. Try signing in instead.';
        } else if (msg.includes('password') && msg.includes('short')) {
          friendlyMessage = 'Password must be at least 6 characters.';
        } else if (msg.includes('invalid email') || msg.includes('valid email')) {
          friendlyMessage = 'Please enter a valid email address.';
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          friendlyMessage = 'Too many attempts. Please wait a minute and try again.';
        } else if (msg.includes('confirmation') || msg.includes('smtp') || msg.includes('email')) {
          // SMTP errors — account was created, email just failed to send
          friendlyMessage = null;
        } else {
          friendlyMessage = 'Something went wrong. Please try again.';
        }

        if (friendlyMessage) {
          setError(friendlyMessage);
          return;
        }
        // If friendlyMessage is null, fall through to success state below
      }

      // Success — fire Resend welcome email and show success screen
      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      setMode("signup_success");
      return;
    }

    // signin
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      quiz_level: 0,
    }, { onConflict: "id", ignoreDuplicates: true });
    const { data: profile } = await supabase
      .from("profiles")
      .select("quiz_level")
      .eq("id", user.id)
      .single();
    const level = profile?.quiz_level ?? 0;
    onDismiss();
    if (level === 0) {
      router.push("/quiz");
    } else {
      router.push("/profile");
    }
  };

  const titles = {
    signin:         "Sign in to Throughline",
    signup:         "Create your free account",
    forgot:         "Reset your password",
    sent:           "Reset link sent",
    signup_success: "Account created.",
  };

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "32px 28px", maxWidth: 340, width: "90%", textAlign: "center" }}>

        {/* Logo mark */}
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 10 }}>THROUGHLINE</div>

        {/* Title */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 20, color: C.parchment, lineHeight: 1.25, marginBottom: 20 }}>
          {message && mode === "signin" ? message : titles[mode]}
        </div>

        {/* Sent confirmation screen */}
        {mode === "sent" && (
          <div>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 24 }}>
              We sent an email to <strong style={{ color: C.parchment }}>{email}</strong>.<br />
              {mode === "sent" && password === ""
                ? "Click the link to reset your password."
                : "Click the link to confirm your account."}
            </div>
            <button onClick={onDismiss}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.bg, background: C.gold, border: "none", borderRadius: 2, padding: "11px 24px", cursor: "pointer", width: "100%" }}>
              GOT IT
            </button>
          </div>
        )}

        {/* Signup success screen */}
        {mode === "signup_success" && (
          <div>
            <div style={{ fontSize: 32, color: C.green, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 24 }}>
              We sent a confirmation email to <strong style={{ color: C.parchment }}>{email}</strong>. Click the link to activate your account, then come back and sign in.
            </div>
            <button onClick={onDismiss}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 2, padding: "11px 24px", cursor: "pointer", width: "100%", marginBottom: 12 }}>
              OK, GOT IT
            </button>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, lineHeight: 1.6 }}>
              Didn't get it? Check your spam folder or wait a minute and try again.
            </div>
          </div>
        )}

        {/* Main form */}
        {mode !== "sent" && mode !== "signup_success" && (
          <>
            {/* Mode toggle — only for signin/signup */}
            {(mode === "signin" || mode === "signup") && (
              <div style={{ display: "flex", gap: 0, marginBottom: 20, border: `1px solid ${C.goldBorder}`, borderRadius: 2, overflow: "hidden" }}>
                {["signin", "signup"].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(null); }}
                    style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", padding: "8px", border: "none", cursor: "pointer", background: mode === m ? C.gold : "transparent", color: mode === m ? C.bg : C.parchmentDim }}>
                    {m === "signin" ? "SIGN IN" : "SIGN UP"}
                  </button>
                ))}
              </div>
            )}

            {/* Email */}
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${C.goldBorder}`, borderRadius: 2, padding: "12px 14px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}
            />

            {/* Password — hidden on forgot */}
            {mode !== "forgot" && (
              <input
                type="password"
                placeholder="password (6+ characters)"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${error ? C.red : C.goldBorder}`, borderRadius: 2, padding: "12px 14px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}
              />
            )}

            {/* Error */}
            {error && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.red, marginBottom: 10 }}>{error}</div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.12em", color: C.bg, backgroundColor: loading ? C.goldDim : C.gold, border: "none", borderRadius: 2, padding: 13, cursor: loading ? "default" : "pointer", width: "100%", marginBottom: 14 }}>
              {loading ? "LOADING…" : mode === "signup" ? "CREATE ACCOUNT →" : mode === "forgot" ? "SEND RESET LINK →" : "SIGN IN →"}
            </button>

            {/* Forgot password link */}
            {mode === "signin" && (
              <button onClick={() => { setMode("forgot"); setError(null); }}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, background: "none", border: "none", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", display: "block", marginBottom: 8, width: "100%" }}>
                Forgot your password?
              </button>
            )}

            {/* Back link on forgot */}
            {mode === "forgot" && (
              <button onClick={() => { setMode("signin"); setError(null); }}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, background: "none", border: "none", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", display: "block", marginBottom: 8, width: "100%" }}>
                ← Back to sign in
              </button>
            )}

            {/* Dismiss */}
            <button onClick={onDismiss}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, background: "none", border: "none", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
              maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
