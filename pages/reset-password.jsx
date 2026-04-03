import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

const C = {
  bg: "#0a0b0d", bgCard: "#11131a", bgDeep: "#0d0f14",
  gold: "#c9a84c", goldDim: "#8a6e30", goldBorder: "rgba(201,168,76,0.35)",
  parchment: "#e8dfc8", parchmentDim: "#a89d88", red: "#c94c4c", green: "#4ca87c",
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Playfair+Display:ital,wght@1,400&family=Inter:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }
`;

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });
  }, []);

  const handleReset = async () => {
    setError(null);
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/"), 3000);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "32px 28px", maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 10 }}>THROUGHLINE</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 20, color: C.parchment, lineHeight: 1.25, marginBottom: 24 }}>
          {success ? "Password updated" : "Set a new password"}
        </div>

        {success ? (
          <div>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7 }}>
              Your password has been updated. Redirecting you home…
            </div>
          </div>
        ) : !validSession ? (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7 }}>
            This reset link is invalid or has expired.{" "}
            <button onClick={() => router.push("/")} style={{ color: C.gold, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Go home</button>
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder="New password (6+ characters)"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${C.goldBorder}`, borderRadius: 2, padding: "12px 14px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleReset()}
              style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${error ? C.red : C.goldBorder}`, borderRadius: 2, padding: "12px 14px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}
            />
            {error && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.red, marginBottom: 10 }}>{error}</div>}
            <button onClick={handleReset} disabled={loading}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.12em", color: C.bg, backgroundColor: loading ? C.goldDim : C.gold, border: "none", borderRadius: 2, padding: 13, cursor: loading ? "default" : "pointer", width: "100%" }}>
              {loading ? "UPDATING…" : "UPDATE PASSWORD →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
