import { useRouter } from "next/router";
import { useAuth } from "../lib/auth";

export default function Nav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  return (
    <nav style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 24px", borderBottom: "1px solid rgba(201,168,76,0.15)",
      position: "sticky", top: 0, zIndex: 100, background: "#0a0b0d",
    }}>
      <button onClick={() => router.push("/")}
        style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.2em", color: "#c9a84c", background: "none", border: "none", cursor: "pointer" }}>
        ← THROUGHLINE
      </button>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {user ? (
          <>
            <button onClick={() => router.push("/profile")}
              style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", color: "#e8dfc8", background: "none", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 3, padding: "7px 14px", cursor: "pointer" }}>
              MY PROFILE
            </button>
            <button onClick={() => router.push("/feed")}
              style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", color: "#e8dfc8", background: "none", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 3, padding: "7px 14px", cursor: "pointer" }}>
              MY FEED
            </button>
            <button onClick={() => router.push("/quiz")}
              style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", color: "#0a0b0d", background: "#c9a84c", border: "none", borderRadius: 3, padding: "7px 14px", cursor: "pointer" }}>
              TAKE THE QUIZ
            </button>
            <button onClick={signOut}
              style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", color: "#a89d88", background: "none", border: "none", cursor: "pointer" }}>
              SIGN OUT
            </button>
          </>
        ) : (
          <button onClick={() => router.push("/quiz")}
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", color: "#0a0b0d", background: "#c9a84c", border: "none", borderRadius: 3, padding: "7px 14px", cursor: "pointer" }}>
            TAKE THE QUIZ
          </button>
        )}
      </div>
    </nav>
  );
}
