import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";
import AuthModal from "./AuthModal";

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDrawerOpen(false);
    router.push("/");
  };

  const drawerLink = (label, href, disabled) => (
    <button
      key={label}
      onClick={disabled ? undefined : () => { router.push(href); setDrawerOpen(false); }}
      style={{
        fontFamily: "Arial", fontSize: 15,
        color: disabled ? "#9A9488" : "#F0ECE4",
        background: "none", border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: "14px 0",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
        textAlign: "left", width: "100%",
      }}
    >{label}</button>
  );

  const sectionHeader = (label) => (
    <div style={{
      fontFamily: "Arial Black", fontSize: 9,
      letterSpacing: "0.25em", color: "#C9A84C",
      textTransform: "uppercase", marginTop: 24, marginBottom: 8,
    }}>{label}</div>
  );

  return (
    <>
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 24px",
        borderBottom: "0.5px solid rgba(201,168,76,0.15)",
        position: "sticky", top: 0, zIndex: 200, background: "#0a0b0d",
      }}>
        {/* Logo */}
        <button onClick={() => router.push("/")} style={{
          fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em",
          color: "#C9A84C", background: "none", border: "none", cursor: "pointer",
        }}>THROUGHLINE</button>

        {/* Desktop center links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {[["Feed", "/feed"], ["Quiz", "/quiz"], ["Politicians", "/feed"]].map(([label, href]) => (
              <button key={label} onClick={() => router.push(href)} style={{
                fontFamily: "Arial", fontSize: 14, color: "#F0ECE4",
                background: "none", border: "none", cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* Desktop right / Mobile hamburger */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!isMobile && (
            user ? (
              <button onClick={() => router.push("/profile")} style={{
                fontFamily: "Arial Black", fontSize: 12, color: "#0A0B0D",
                background: "#C9A84C", border: "none", borderRadius: 4,
                padding: "8px 18px", cursor: "pointer", letterSpacing: "0.06em",
                touchAction: "manipulation",
              }}>MY PROFILE</button>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{
                fontFamily: "Arial Black", fontSize: 12, color: "#0A0B0D",
                background: "#C9A84C", border: "none", borderRadius: 4,
                padding: "8px 18px", cursor: "pointer", letterSpacing: "0.06em",
                touchAction: "manipulation",
              }}>SIGN IN</button>
            )
          )}
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} style={{
              fontSize: 24, color: "#C9A84C", background: "none",
              border: "none", cursor: "pointer", lineHeight: 1,
              touchAction: "manipulation",
            }}>☰</button>
          )}
        </div>
      </nav>

      {/* Overlay */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 299,
          }}
        />
      )}

      {/* Drawer */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, right: 0, height: "100vh", width: 280,
          background: "#111318",
          borderLeft: "0.5px solid rgba(255,255,255,0.08)",
          zIndex: 300,
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms ease",
          padding: "24px 20px",
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* Drawer header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <span style={{ fontFamily: "Arial Black", fontSize: 12, letterSpacing: "0.2em", color: "#C9A84C" }}>THROUGHLINE</span>
            <button onClick={() => setDrawerOpen(false)} style={{
              fontSize: 20, color: "#9A9488", background: "none", border: "none", cursor: "pointer",
            }}>✕</button>
          </div>

          {sectionHeader("DISCOVER")}
          {drawerLink("Feed", "/feed")}
          {drawerLink("Politicians", "/feed")}

          {sectionHeader("YOUR QUIZ")}
          {drawerLink("Level 1 — Voter", "/quiz")}
          {drawerLink("Level 2 — Informed", "/quiz?level=2")}
          <div style={{
            fontFamily: "Arial", fontSize: 15, color: "#9A9488",
            padding: "14px 0", borderBottom: "0.5px solid rgba(255,255,255,0.05)",
          }}>Level 3 — Coming Soon</div>

          {sectionHeader("ACCOUNT")}
          {user ? (
            <>
              {drawerLink("My Profile", "/profile")}
              <button onClick={handleSignOut} style={{
                fontFamily: "Arial", fontSize: 15, color: "#F0ECE4",
                background: "none", border: "none", cursor: "pointer",
                padding: "14px 0", borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                textAlign: "left", width: "100%",
              }}>Sign Out</button>
            </>
          ) : (
            <button onClick={() => { setShowAuth(true); setDrawerOpen(false); }} style={{
              fontFamily: "Arial", fontSize: 15, color: "#F0ECE4",
              background: "none", border: "none", cursor: "pointer",
              padding: "14px 0", borderBottom: "0.5px solid rgba(255,255,255,0.05)",
              textAlign: "left", width: "100%",
            }}>Sign In</button>
          )}
        </div>
      )}

      {showAuth && (
        <AuthModal onDismiss={() => setShowAuth(false)} />
      )}
    </>
  );
}
