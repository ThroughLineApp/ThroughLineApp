import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";
import ZipPrompt from "./ZipPrompt";
import { PRIMARY } from "../lib/buttons";

const C = {
  bg: "#0A0B0D",
  bgCard: "#111318",
  bgDeep: "#0d0f14",
  gold: "#C9A84C",
  goldDim: "#8a6e30",
  goldBorder: "rgba(201,168,76,0.35)",
  parchment: "#F0ECE4",
  parchmentDim: "#9A9488",
  green: "#4CAF7D",
  red: "#E05C4B",
};

export default function AuthModal({ message, onDismiss }) {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [showSignUpPw, setShowSignUpPw] = useState(false);

  const inputStyle = {
    width: "100%", background: C.bgDeep,
    border: `1.5px solid ${C.goldBorder}`, borderRadius: 4,
    padding: "12px 14px", fontSize: 14, color: C.parchment,
    outline: "none", fontFamily: "Arial", marginBottom: 10,
    boxSizing: "border-box", display: "block",
  };

  const handleSignIn = async () => {
    setError(null);
    const trimmedId = identifier.trim();
    if (!trimmedId) { setError("Enter your email or username."); return; }
    if (!password || password.length < 6) { setError("Password must be 6+ characters."); return; }
    setLoading(true);

    let emailToUse = trimmedId;
    if (!trimmedId.includes("@")) {
      // Treat as username — look up the email
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", trimmedId.toLowerCase())
        .maybeSingle();
      if (!profileRow?.email) {
        setLoading(false);
        setError("No account found with that username.");
        return;
      }
      emailToUse = profileRow.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
    if (signInError) { setLoading(false); setError(signInError.message); return; }
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    if (!signedInUser) {
      setLoading(false);
      setError("Sign in failed. Please try again.");
      return;
    }

    // Explicitly fetch or create the profile and wait for it
    const { data: profileData } = await supabase
      .from("profiles")
      .upsert({
        id: signedInUser.id,
        email: signedInUser.email,
        username: signedInUser.user_metadata?.username || null,
        quiz_level: 0,
      }, { onConflict: "id", ignoreDuplicates: false })
      .select()
      .single();

    const level = profileData?.quiz_level ?? 0;
    setLoading(false);
    onDismiss();
    if (level === 0) {
      router.push("/quiz");
    } else {
      router.push("/profile");
    }
  };

  const handleSignUp = async () => {
    setError(null);
    const trimmedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError("Username must be 3–20 characters: letters, numbers, underscores only."); return;
    }
    if (!identifier || !identifier.includes("@")) { setError("Enter a valid email."); return; }
    if (!password || password.length < 6) { setError("Password must be 6+ characters."); return; }
    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles").select("id").eq("username", trimmedUsername).maybeSingle();
    if (existing) { setLoading(false); setError("That username is taken. Try another."); return; }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: identifier, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: { username: trimmedUsername },
      }
    });
    if (signUpError) {
      setLoading(false);
      const msg = signUpError.message?.toLowerCase() || "";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("An account with this email already exists. Sign in instead.");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // Save username to profiles immediately so it's reserved before email confirmation
    if (data?.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          { id: data.user.id, username: trimmedUsername },
          { onConflict: "id" }
        );
      if (profileError?.code === "23505") {
        setLoading(false);
        setError("That username is taken. Try another.");
        return;
      }
    }

    setLoading(false);
    setMode("signup_success");
  };

  const handleForgot = async () => {
    setError(null);
    if (!identifier || !identifier.includes("@")) { setError("Enter your email address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMode("forgot_sent");
  };

  return (
    <div onClick={onDismiss} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.bgCard, border: `1px solid ${C.goldBorder}`,
        borderRadius: 8, padding: "32px 28px", maxWidth: 360,
        width: "90%", textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11,
          letterSpacing: "0.25em", color: C.gold, marginBottom: 10,
        }}>THROUGHLINE</div>

        {mode === "signin" && (<>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "0.05em", color: C.parchment, marginBottom: 6 }}>
            {message || "Sign in to Throughline"}
          </div>
          <p style={{ fontFamily: "Arial", fontSize: 12, color: C.parchmentDim, marginBottom: 20, lineHeight: 1.5 }}>
            Don't have an account?{" "}
            <span onClick={() => { setMode("signup"); setError(null); }}
              style={{ color: C.gold, cursor: "pointer", textDecoration: "underline" }}>
              Create one →
            </span>
          </p>
          <input type="text" placeholder="Email or username" value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(null); }} style={inputStyle} />
          <div style={{ position: "relative" }}>
            <input type={showSignInPw ? "text" : "password"} placeholder="Password" value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSignIn()}
              style={{ ...inputStyle, borderColor: error ? C.red : C.goldBorder, paddingRight: 52 }} />
            <button onClick={() => setShowSignInPw(v => !v)} type="button" style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontFamily: "Arial", fontSize: 11, color: C.parchmentDim,
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
            }}>{showSignInPw ? "Hide" : "Show"}</button>
          </div>
          {error && <div style={{ fontFamily: "Arial", fontSize: 11, color: C.red, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleSignIn} disabled={loading} style={{
            ...PRIMARY, fontSize: 14,
            background: loading ? C.goldDim : C.gold,
            padding: "13px 0", width: "100%",
            cursor: loading ? "default" : "pointer",
            marginBottom: 12, touchAction: "manipulation",
          }}>{loading ? "SIGNING IN…" : "SIGN IN →"}</button>
          <button onClick={() => { setMode("forgot"); setError(null); }} style={{
            fontFamily: "Arial", fontSize: 11, color: C.parchmentDim,
            background: "none", border: "none", textDecoration: "underline",
            cursor: "pointer", display: "block", width: "100%", marginBottom: 8,
          }}>Forgot your password?</button>
          <button onClick={onDismiss} style={{
            fontFamily: "Arial", fontSize: 11, color: C.parchmentDim,
            background: "none", border: "none", textDecoration: "underline", cursor: "pointer",
          }}>Maybe later</button>
        </>)}

        {mode === "signup" && (<>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "0.05em", color: C.parchment, marginBottom: 6 }}>
            Create your free account
          </div>
          <p style={{ fontFamily: "Arial", fontSize: 12, color: C.parchmentDim, marginBottom: 20, lineHeight: 1.5 }}>
            Your username is how others see you in the feed and discussions.
          </p>
          <input type="text" placeholder="Username (letters, numbers, underscores)"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(null); }} style={inputStyle} />
          <input type="email" placeholder="Email address" value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(null); }} style={inputStyle} />
          <div style={{ position: "relative" }}>
            <input type={showSignUpPw ? "text" : "password"} placeholder="Password (6+ characters)" value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSignUp()}
              style={{ ...inputStyle, borderColor: error ? C.red : C.goldBorder, paddingRight: 52 }} />
            <button onClick={() => setShowSignUpPw(v => !v)} type="button" style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontFamily: "Arial", fontSize: 11, color: C.parchmentDim,
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
            }}>{showSignUpPw ? "Hide" : "Show"}</button>
          </div>
          {error && <div style={{ fontFamily: "Arial", fontSize: 11, color: C.red, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleSignUp} disabled={loading} style={{
            ...PRIMARY, fontSize: 14,
            background: loading ? C.goldDim : C.gold,
            padding: "13px 0", width: "100%",
            cursor: loading ? "default" : "pointer",
            marginBottom: 12, touchAction: "manipulation",
          }}>{loading ? "CREATING ACCOUNT…" : "CREATE ACCOUNT →"}</button>
          <button onClick={() => { setMode("signin"); setError(null); }} style={{
            fontFamily: "Arial", fontSize: 11, color: C.parchmentDim,
            background: "none", border: "none", textDecoration: "underline", cursor: "pointer",
          }}>← Already have an account? Sign in</button>
        </>)}

        {mode === "signup_success" && (<>
          <div style={{ fontSize: 32, color: C.green, marginBottom: 12 }}>✓</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.05em", color: C.parchment, marginBottom: 8 }}>
            Account created.
          </div>
          <div style={{ fontFamily: "Arial", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 12 }}>
            We sent a confirmation email to{" "}
            <strong style={{ color: C.parchment }}>{identifier}</strong>.
            Click the link to activate your account, then come back and sign in.
          </div>
          <div style={{ fontFamily: "Arial", fontSize: 12, color: "#9A9488", lineHeight: 1.6, marginBottom: 24 }}>
            Once you confirm your email and sign in, we'll ask for your ZIP to find your representatives.
          </div>
          <button onClick={onDismiss} style={{
            ...PRIMARY, fontSize: 13,
            padding: "11px 24px", width: "100%",
          }}>OK, GOT IT</button>
        </>)}

        {mode === "zip_prompt" && (
          <ZipPrompt
            context="signup"
            onComplete={() => onDismiss()}
            onDismiss={() => onDismiss()}
          />
        )}

        {mode === "forgot" && (<>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "0.05em", color: C.parchment, marginBottom: 20 }}>
            Reset your password
          </div>
          <input type="email" placeholder="Your email address" value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(null); }} style={inputStyle} />
          {error && <div style={{ fontFamily: "Arial", fontSize: 11, color: C.red, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleForgot} disabled={loading} style={{
            ...PRIMARY, fontSize: 14,
            background: loading ? C.goldDim : C.gold,
            padding: "13px 0", width: "100%",
            cursor: loading ? "default" : "pointer",
            marginBottom: 12, touchAction: "manipulation",
          }}>{loading ? "SENDING…" : "SEND RESET LINK →"}</button>
          <button onClick={() => { setMode("signin"); setError(null); }} style={{
            fontFamily: "Arial", fontSize: 11, color: C.parchmentDim,
            background: "none", border: "none", textDecoration: "underline", cursor: "pointer",
          }}>← Back to sign in</button>
        </>)}

        {mode === "forgot_sent" && (<>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <div style={{ fontFamily: "Arial", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 24 }}>
            We sent a reset link to{" "}
            <strong style={{ color: C.parchment }}>{identifier}</strong>.
            Click it to set a new password.
          </div>
          <button onClick={onDismiss} style={{
            ...PRIMARY, fontSize: 13,
            padding: "11px 24px", width: "100%",
          }}>GOT IT</button>
        </>)}
      </div>
    </div>
  );
}
