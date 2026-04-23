import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../lib/supabase";

const C = {
  bg: "#0A0B0D",
  text: "#F0ECE4",
  gold: "#C9A84C",
  green: "#4CAF7D",
  red: "#E05C4B",
  dim: "#9A9488",
};

export default function AuthConfirm() {
  const router = useRouter();
  const [uiState, setUiState] = useState("loading"); // loading | confirmed | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    async function confirm() {
      // ── Format 1: query param  ?token_hash=XXX&type=email ──────────────────
      const { token_hash, type } = router.query;

      // ── Format 2: hash fragment  #access_token=XXX&refresh_token=XXX ───────
      const hashStr = typeof window !== "undefined"
        ? window.location.hash.replace(/^#/, "")
        : "";
      const hashParams = new URLSearchParams(hashStr);
      const access_token  = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      let verifyError = null;

      if (token_hash && type) {
        // Query param format — verifyOtp
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        verifyError = error;
      } else if (access_token && refresh_token) {
        // Hash fragment format — setSession
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        verifyError = error;
      } else {
        setUiState("error");
        setErrorMsg("Invalid confirmation link. Please try signing up again.");
        return;
      }

      if (verifyError) {
        setUiState("error");
        setErrorMsg("Confirmation failed: " + verifyError.message);
        return;
      }

      // Get the now-authenticated user and upsert their profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          quiz_level: 0,
          created_at: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });
      }

      setUiState("confirmed");
      setTimeout(() => router.push("/profile"), 1500);
    }

    confirm();
  }, [router.isReady, router.query]);

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      padding: "0 24px",
    }}>

      {uiState === "loading" && (
        <>
          <div style={{
            width: 40, height: 40,
            border: `3px solid ${C.gold}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ fontFamily: "Arial", fontSize: 15, color: C.dim, textAlign: "center" }}>
            Confirming your account…
          </p>
        </>
      )}

      {uiState === "confirmed" && (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(76,175,125,0.15)",
            border: `2px solid ${C.green}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, color: C.green,
          }}>✓</div>
          <div style={{ fontFamily: "Arial Black", fontSize: 20, color: C.text, textAlign: "center" }}>
            You're in. Welcome to Throughline.
          </div>
          <p style={{ fontFamily: "Arial", fontSize: 14, color: C.dim, textAlign: "center" }}>
            Taking you to your profile…
          </p>
        </>
      )}

      {uiState === "error" && (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(224,92,75,0.12)",
            border: `2px solid ${C.red}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, color: C.red,
          }}>✕</div>
          <div style={{ fontFamily: "Arial Black", fontSize: 18, color: C.text, textAlign: "center" }}>
            Something went wrong
          </div>
          <p style={{ fontFamily: "Arial", fontSize: 14, color: C.dim, textAlign: "center", maxWidth: 340 }}>
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/?signin=true")}
            style={{
              fontFamily: "Arial Black", fontSize: 13,
              color: C.bg, background: C.gold,
              border: "none", borderRadius: 4,
              padding: "12px 28px", cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            BACK TO SIGN IN →
          </button>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
