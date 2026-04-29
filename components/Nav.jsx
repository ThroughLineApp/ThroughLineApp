import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import AuthModal from "./AuthModal";
import PersonalDrawer from "./PersonalDrawer";
import supabase from "../lib/supabase";

// ── Thumbprint avatar helpers ──────────────────────────────────────────────────
const THUMB_DIMS = [
  "economic","healthcare","climate","criminal","immigration","foreign",
  "education","freedom","guns","housing","tech","voting",
];

function TinyThumbprint({ profile }) {
  const cx = 14, cy = 14, r = 11;
  const pts = THUMB_DIMS.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / THUMB_DIMS.length - Math.PI / 2;
    const val = profile?.[`score_${dim}`] ?? 50;
    const rr = (val / 100) * r;
    return `${(cx + rr * Math.cos(angle)).toFixed(2)},${(cy + rr * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <polygon points={pts} fill="rgba(201,168,76,0.2)" stroke="#c9a84c" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Feed",         href: "/feed" },
  { label: "Quiz",         href: "/quiz" },
  { label: "Politicians",  href: "/feed" },
  { label: "Events",       href: "/events" },
  { label: "Calendar",     href: "/calendar" },
  { label: "Call Your Rep",href: "/call",   gold: true },
];

export default function Nav() {
  const router  = useRouter();
  const { user, profile } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pdOpen,     setPdOpen]     = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);

  // ── Mobile detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Lock body scroll when drawer open ──────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // ── Close drawer on route change ───────────────────────────────────────────
  useEffect(() => {
    const handleRouteChange = () => setDrawerOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

  const isActive = (href) => router.pathname === href;

  const navigate = (href) => {
    setDrawerOpen(false);
    router.push(href);
  };

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const openAuth = () => {
    setDrawerOpen(false);
    setShowAuth(true);
  };

  const username = profile?.username || user?.user_metadata?.username || null;
  const hasThumbprint = user && THUMB_DIMS.some(d => profile?.[`score_${d}`] != null);

  // ── THUMBPRINT AVATAR BUTTON ────────────────────────────────────────────────
  const avatarBtn = (
    <button
      onClick={() => setPdOpen(true)}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "1.5px solid rgba(201,168,76,0.4)",
        background: "#11131a",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0, flexShrink: 0,
        touchAction: "manipulation",
      }}
    >
      {hasThumbprint ? (
        <TinyThumbprint profile={profile} />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a89d88" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
        </svg>
      )}
    </button>
  );

  // ── DESKTOP NAV ────────────────────────────────────────────────────────────
  const DesktopNav = (
    <nav style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 32px",
      borderBottom: "0.5px solid rgba(201,168,76,0.15)",
      position: "sticky", top: 0, zIndex: 200, background: "#0a0b0d",
    }}>
      {/* Wordmark */}
      <button onClick={() => router.push("/")} style={{
        fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em",
        color: "#C9A84C", background: "none", border: "none", cursor: "pointer",
      }}>THROUGHLINE</button>

      {/* Center links */}
      <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
        {NAV_LINKS.map(({ label, href, gold }) => (
          <button key={label} onClick={() => router.push(href)} style={{
            fontFamily: "Arial", fontSize: 14,
            color: isActive(href) ? "#C9A84C" : (gold ? "#C9A84C" : "#F0ECE4"),
            background: "none", border: "none", cursor: "pointer",
            fontWeight: gold ? "bold" : "normal",
            borderBottom: isActive(href) ? "1.5px solid #C9A84C" : "1.5px solid transparent",
            paddingBottom: 2,
          }}>{label}</button>
        ))}
      </div>

      {/* Right — avatar + auth */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {avatarBtn}
        {user ? (
          <button onClick={handleSignOut} style={{
            fontFamily: "Arial", fontSize: 12, color: "#9A9488",
            background: "none", border: "none", cursor: "pointer",
          }}>Sign Out</button>
        ) : (
          <button onClick={openAuth} style={{
            fontFamily: "Arial Black", fontSize: 12, color: "#0A0B0D",
            background: "#C9A84C", border: "none", borderRadius: 4,
            padding: "8px 18px", cursor: "pointer", letterSpacing: "0.06em",
            touchAction: "manipulation",
          }}>SIGN IN</button>
        )}
      </div>
    </nav>
  );

  // ── MOBILE TOP BAR ─────────────────────────────────────────────────────────
  const MobileBar = (
    <nav style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 20px",
      borderBottom: "0.5px solid rgba(201,168,76,0.15)",
      position: "sticky", top: 0, zIndex: 200, background: "#0a0b0d",
    }}>
      {/* Wordmark */}
      <button onClick={() => router.push("/")} style={{
        fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em",
        color: "#C9A84C", background: "none", border: "none", cursor: "pointer",
      }}>THROUGHLINE</button>

      {/* Right: avatar + hamburger */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {avatarBtn}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          style={{
            display: "flex", flexDirection: "column", justifyContent: "center",
            alignItems: "center", gap: 5,
            width: 44, height: 44,
            background: "none", border: "none", cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          <span style={{ display: "block", width: 22, height: 2, background: "#C9A84C", borderRadius: 1 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#C9A84C", borderRadius: 1 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#C9A84C", borderRadius: 1 }} />
        </button>
      </div>
    </nav>
  );

  // ── DRAWER ─────────────────────────────────────────────────────────────────
  const Drawer = (
    <>
      {/* Overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 199,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0,
        height: "100vh", width: 280,
        background: "#111318",
        borderLeft: "0.5px solid rgba(255,255,255,0.08)",
        zIndex: 200,
        transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms ease",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Close button */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px 0" }}>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              fontSize: 24, color: "#C9A84C",
              background: "none", border: "none", cursor: "pointer",
              width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
              touchAction: "manipulation",
            }}
          >✕</button>
        </div>

        {/* Wordmark */}
        <div style={{
          fontFamily: "Arial Black", fontSize: 13,
          letterSpacing: "0.2em", color: "#C9A84C",
          marginTop: 8, padding: "0 24px",
        }}>THROUGHLINE</div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 24px" }} />

        {/* EXPLORE section */}
        <div style={{
          fontFamily: "Arial", fontSize: 10, color: "#9A9488",
          letterSpacing: "0.15em", textTransform: "uppercase",
          padding: "0 24px", marginBottom: 8,
        }}>EXPLORE</div>

        {NAV_LINKS.map(({ label, href, gold }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            style={{
              display: "block", width: "100%",
              padding: "14px 24px",
              fontFamily: "Arial", fontSize: 15,
              color: isActive(href) ? "#C9A84C" : (gold ? "#C9A84C" : "#F0ECE4"),
              background: isActive(href) ? "rgba(201,168,76,0.06)" : "none",
              border: "none",
              borderLeft: isActive(href) ? "3px solid #C9A84C" : "3px solid transparent",
              textAlign: "left", cursor: "pointer",
              touchAction: "manipulation",
            }}
          >{label}</button>
        ))}

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "12px 24px" }} />

        {/* ACCOUNT section */}
        <div style={{
          fontFamily: "Arial", fontSize: 10, color: "#9A9488",
          letterSpacing: "0.15em", textTransform: "uppercase",
          padding: "0 24px", marginBottom: 8,
        }}>ACCOUNT</div>

        {user ? (
          <>
            {username && (
              <div style={{
                fontFamily: "Arial", fontSize: 15, color: "#F0ECE4",
                padding: "14px 24px",
              }}>{username}</div>
            )}
            <button onClick={() => navigate("/profile")} style={{
              display: "block", width: "100%",
              padding: "14px 24px",
              fontFamily: "Arial", fontSize: 15,
              color: isActive("/profile") ? "#C9A84C" : "#F0ECE4",
              background: "none", border: "none",
              borderLeft: isActive("/profile") ? "3px solid #C9A84C" : "3px solid transparent",
              textAlign: "left", cursor: "pointer",
              touchAction: "manipulation",
            }}>My Profile</button>
            <button onClick={handleSignOut} style={{
              display: "block", width: "100%",
              padding: "14px 24px",
              fontFamily: "Arial", fontSize: 14, color: "#9A9488",
              background: "none", border: "none", borderLeft: "3px solid transparent",
              textAlign: "left", cursor: "pointer",
              touchAction: "manipulation",
            }}>Sign Out</button>
          </>
        ) : (
          <div style={{ padding: "0 24px", marginTop: 4 }}>
            <button onClick={openAuth} style={{
              display: "block", width: "100%",
              padding: "14px 0",
              fontFamily: "Arial Black", fontSize: 13,
              color: "#0A0B0D", background: "#C9A84C",
              border: "none", borderRadius: 8,
              cursor: "pointer", letterSpacing: "0.04em",
              touchAction: "manipulation",
              textAlign: "center",
            }}>SIGN IN</button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {isMobile ? MobileBar : DesktopNav}
      {isMobile && Drawer}

      {showAuth && (
        <AuthModal onDismiss={() => setShowAuth(false)} />
      )}

      <PersonalDrawer
        isOpen={pdOpen}
        onClose={() => setPdOpen(false)}
        user={user}
        profile={profile}
        router={router}
      />
    </>
  );
}
