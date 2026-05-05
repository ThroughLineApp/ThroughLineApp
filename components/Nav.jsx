import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import supabase from "../lib/supabase";


const NAV_LINKS = [
  { label: "Feed",         href: "/feed" },
  { label: "Alerts",       href: "/alerts", bell: true },
  { label: "Quiz",         href: "/quiz" },
  { label: "Explore",      href: "/explore" },
  { label: "Events",       href: "/events" },
  { label: "Calendar",     href: "/calendar" },
  { label: "Call Your Rep",href: "/call",   gold: true },
];

// Hamburger drawer — navigation overflow only (not in bottom nav)
const DRAWER_LINKS = [
  { label: "Quiz",         href: "/quiz" },
  { label: "News",         href: "/news" },
  { label: "Call Your Rep",href: "/call", gold: true },
];

// Mobile bottom nav items
const BOTTOM_NAV = [
  { label: "Feed",    href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Local",   href: "/local" },
  { label: "Profile", href: "/profile" },
];

export default function Nav() {
  const router  = useRouter();
  const { user, profile, setShowAuthModal } = useAuth();

  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [alertsBadge,  setAlertsBadge]  = useState(0);

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

  // ── Alerts badge: count unread events for followed politicians ─────────────
  useEffect(() => {
    if (!user || !profile) { setAlertsBadge(0); return; }
    const followedPols = profile.followed_politicians || [];
    if (followedPols.length === 0) { setAlertsBadge(0); return; }

    const lastSeen = profile.alerts_last_seen_at || null;
    let query = supabase
      .from("throughline_events")
      .select("*", { count: "exact", head: true })
      .in("politician_id", followedPols);
    if (lastSeen) query = query.gt("created_at", lastSeen);

    query.then(({ count, error }) => {
      if (!error && count !== null) setAlertsBadge(count);
    });
  }, [user?.id, profile?.alerts_last_seen_at, (profile?.followed_politicians || []).join(",")]);

  // ── Clear badge when user visits /alerts ──────────────────────────────────
  useEffect(() => {
    if (router.pathname === "/alerts") setAlertsBadge(0);
  }, [router.pathname]);

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
    setShowAuthModal(true);
  };

  const username = profile?.username || user?.user_metadata?.username || null;

  // ── DESKTOP NAV ────────────────────────────────────────────────────────────
  const DesktopNav = (
    <nav style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 32px",
      borderBottom: "0.5px solid rgba(201,168,76,0.15)",
      position: "sticky", top: 0, zIndex: 400, background: "#0a0b0d",
    }}>
      {/* Wordmark */}
      <button onClick={() => router.push("/")} style={{
        fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em",
        color: "#C9A84C", background: "none", border: "none", cursor: "pointer",
      }}>THROUGHLINE</button>

      {/* Center links */}
      <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
        {NAV_LINKS.map(({ label, href, gold, bell }) => (
          <button key={label} onClick={() => router.push(href)} style={{
            fontFamily: "Arial", fontSize: 14,
            color: isActive(href) ? "#C9A84C" : (gold ? "#C9A84C" : "#F0ECE4"),
            background: "none", border: "none", cursor: "pointer",
            fontWeight: gold ? "bold" : "normal",
            borderBottom: isActive(href) ? "1.5px solid #C9A84C" : "1.5px solid transparent",
            paddingBottom: 2, position: "relative",
          }}>
            {label}
            {bell && alertsBadge > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -10,
                background: "#c9a84c", color: "#0a0b0d",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9, lineHeight: 1,
                borderRadius: 8, padding: "2px 4px",
                minWidth: 14, textAlign: "center",
              }}>
                {alertsBadge > 99 ? "99+" : alertsBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Right — auth */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
      position: "sticky", top: 0, zIndex: 400, background: "#0a0b0d",
    }}>
      {/* Wordmark */}
      <button onClick={() => router.push("/")} style={{
        fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em",
        color: "#C9A84C", background: "none", border: "none", cursor: "pointer",
      }}>THROUGHLINE</button>

      {/* Right: hamburger */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

        {/* Auth section */}
        {user ? (
          <>
            <div style={{
              fontFamily: "Figtree, sans-serif", fontSize: 12,
              fontStyle: "italic", color: "#9A9488",
              padding: "0 24px 4px",
            }}>
              Signed in as {username ? `@${username}` : user.email}
            </div>
            <button
              onClick={handleSignOut}
              style={{
                display: "block", width: "100%",
                padding: "10px 24px",
                fontFamily: "Arial", fontSize: 15,
                color: "#9A9488",
                background: "none", border: "none",
                borderLeft: "3px solid transparent",
                textAlign: "left", cursor: "pointer",
                touchAction: "manipulation",
              }}
            >Sign Out</button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 24px 8px" }} />
          </>
        ) : (
          <>
            <button
              onClick={openAuth}
              style={{
                display: "block", width: "100%",
                padding: "12px 24px",
                fontFamily: "Arial Black", fontSize: 14,
                color: "#0A0B0D", background: "#C9A84C",
                border: "none", borderLeft: "3px solid transparent",
                textAlign: "left", cursor: "pointer",
                letterSpacing: "0.06em",
                touchAction: "manipulation",
              }}
            >SIGN IN →</button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 24px 8px" }} />
          </>
        )}

        {DRAWER_LINKS.map(({ label, href, gold }) => (
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

      </div>
    </>
  );

  // ── MOBILE BOTTOM NAV ──────────────────────────────────────────────────────
  const MobileBottomNav = (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 56, zIndex: 190,
      background: "#0a0b0d",
      borderTop: "0.5px solid rgba(201,168,76,0.15)",
      display: "flex", alignItems: "stretch",
    }}>
      {BOTTOM_NAV.map(({ label, href, bell }) => {
        const active = router.pathname === href;
        const showBadge = bell && alertsBadge > 0;
        return (
          <button
            key={href}
            onClick={() => navigate(href)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              position: "relative",
              touchAction: "manipulation",
            }}
          >
            {/* Icon */}
            {bell ? (
              <div style={{ position: "relative", width: 22, height: 22 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={active ? "#C9A84C" : "#a89d88"} strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {showBadge && (
                  <span style={{
                    position: "absolute", top: -4, right: -6,
                    background: "#c9a84c", color: "#0a0b0d",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 9, lineHeight: 1,
                    borderRadius: 8, padding: "2px 4px",
                    minWidth: 14, textAlign: "center",
                  }}>
                    {alertsBadge > 99 ? "99+" : alertsBadge}
                  </span>
                )}
              </div>
            ) : label === "Feed" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={active ? "#C9A84C" : "#a89d88"} strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            ) : label === "Explore" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={active ? "#C9A84C" : "#a89d88"} strokeWidth="1.8"
                strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            ) : label === "Local" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={active ? "#C9A84C" : "#a89d88"} strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={active ? "#C9A84C" : "#a89d88"} strokeWidth="1.8"
                strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
              </svg>
            )}
            {/* Label */}
            <span style={{
              fontFamily: "Figtree, sans-serif",
              fontSize: 10,
              color: active ? "#C9A84C" : "#a89d88",
              letterSpacing: "0.02em",
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {isMobile ? MobileBar : DesktopNav}
      {isMobile && Drawer}

      {isMobile && MobileBottomNav}
    </>
  );
}
