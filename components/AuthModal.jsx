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
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setMode("sent");
      return;
    }

    // signin
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onDismiss();
  };

  const titles = {
    signin: "Sign in to Throughline",
    signup: "Create your free account",
    forgot: "Reset your password",
    sent:   mode === "signup" ? "Check your email" : "Reset link sent",
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

        {/* Main form */}
        {mode !== "sent" && (
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
