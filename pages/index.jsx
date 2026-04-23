import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import AuthModal from "../components/AuthModal";
import ZipPrompt from "../components/ZipPrompt";
import { useAuth } from "../lib/auth";

function MobileSwiper({ onShowAuth }) {
  const router = useRouter();
  const [card, setCard] = useState(0);
  const touchStartY = useRef(null);
  const TOTAL = 3;

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 40) return;
    if (delta > 0 && card < TOTAL - 1) setCard(c => c + 1);
    if (delta < 0 && card > 0) setCard(c => c - 1);
    touchStartY.current = null;
  };

  const cardStyle = (i) => ({
    position: "absolute", inset: 0,
    transform: `translateY(${(i - card) * 100}%)`,
    transition: "transform 0.4s ease",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  });

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000", overflow: "hidden" }}
    >
      {/* Card 0 — Video */}
      <div style={cardStyle(0)}>
        <video
          src="/videos/landing_card_1.mp4"
          autoPlay muted loop playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Dark gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.82) 100%)",
        }} />
        <div style={{ position: "relative", zIndex: 1, padding: "0 28px", textAlign: "center", maxWidth: 400 }}>
          <div style={{
            display: "inline-block", background: "#C9A84C", color: "#0A0B0D",
            fontFamily: "Arial Black", fontSize: 10, letterSpacing: "0.22em",
            padding: "5px 14px", borderRadius: 2, marginBottom: 22,
          }}>THROUGHLINE</div>
          <h1 style={{
            fontFamily: "Arial Black", fontSize: "clamp(38px, 9vw, 58px)",
            color: "#F0ECE4", lineHeight: 1.05, margin: "0 0 6px",
            letterSpacing: "-0.02em",
          }}>Every vote</h1>
          <h1 style={{
            fontFamily: "Arial Black", fontSize: "clamp(38px, 9vw, 58px)",
            color: "#C9A84C", lineHeight: 1.05, margin: "0 0 20px",
            letterSpacing: "-0.02em",
          }}>has a price.</h1>
          <p style={{
            fontFamily: "Arial", fontSize: 15, color: "rgba(240,236,228,0.8)",
            lineHeight: 1.7, marginBottom: 32,
          }}>
            Track the money behind every congressional vote.
          </p>
          <button
            onClick={() => router.push("/feed")}
            style={{
              fontFamily: "Arial Black", fontSize: 14, color: "#0A0B0D",
              background: "#C9A84C", border: "none", borderRadius: 4,
              padding: "14px 32px", cursor: "pointer",
              letterSpacing: "0.04em", touchAction: "manipulation",
              boxShadow: "0 0 32px rgba(201,168,76,0.3)",
              display: "block", width: "100%", marginBottom: 14,
            }}
          >EXPLORE POLITICIANS →</button>
          <button
            onClick={() => setCard(1)}
            style={{
              fontFamily: "Arial", fontSize: 13, color: "rgba(240,236,228,0.6)",
              background: "none", border: "none", cursor: "pointer",
              touchAction: "manipulation", textDecoration: "underline",
            }}
          >or swipe to learn more ↓</button>
        </div>
      </div>

      {/* Card 1 — Meet Your Reps */}
      <div style={{ ...cardStyle(1), background: "#111318" }}>
        <div style={{ position: "relative", zIndex: 1, padding: "0 32px", textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>🏛️</div>
          <h2 style={{
            fontFamily: "Arial Black", fontSize: 32, color: "#F0ECE4",
            margin: "0 0 16px", letterSpacing: "-0.01em",
          }}>Meet Your Representatives</h2>
          <p style={{
            fontFamily: "Arial", fontSize: 15, color: "#9A9488",
            lineHeight: 1.75, marginBottom: 28,
          }}>
            See which members of Congress actually vote like you — and which ones vote for their donors instead.
          </p>
          <div style={{
            display: "inline-block",
            background: "rgba(201,168,76,0.12)",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 20, padding: "8px 18px",
            fontFamily: "Arial", fontSize: 12, color: "#C9A84C",
            letterSpacing: "0.05em",
          }}>More videos coming soon</div>
        </div>
      </div>

      {/* Card 2 — Follow the Money */}
      <div style={{ ...cardStyle(2), background: "#0A0B0D" }}>
        <div style={{ position: "relative", zIndex: 1, padding: "0 32px", textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>💰</div>
          <h2 style={{
            fontFamily: "Arial Black", fontSize: 32, color: "#F0ECE4",
            margin: "0 0 16px", letterSpacing: "-0.01em",
          }}>Follow the Money</h2>
          <p style={{
            fontFamily: "Arial", fontSize: 15, color: "#9A9488",
            lineHeight: 1.75, marginBottom: 32,
          }}>
            Every PAC donation mapped to every vote. The receipts don't lie. We show you exactly who paid for what.
          </p>
          <button
            onClick={() => onShowAuth()}
            style={{
              fontFamily: "Arial Black", fontSize: 15, color: "#0A0B0D",
              background: "#C9A84C", border: "none", borderRadius: 4,
              padding: "16px 36px", cursor: "pointer",
              letterSpacing: "0.04em", touchAction: "manipulation",
              boxShadow: "0 0 40px rgba(201,168,76,0.25)",
              display: "block", width: "100%",
            }}
          >Start for free →</button>
        </div>
      </div>

      {/* Dot indicators — right side */}
      <div style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 8, zIndex: 10,
      }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            onClick={() => setCard(i)}
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i === card ? "#C9A84C" : "rgba(255,255,255,0.3)",
              cursor: "pointer", transition: "background 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, needsZip } = useAuth();
  const [showAuth, setShowAuth]       = useState(false);
  const [authMode, setAuthMode]       = useState("signin");
  const [scrolled, setScrolled]       = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [zipDismissed, setZipDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      const visited = localStorage.getItem("throughline_visited");
      const { data: { user } } = await supabase.auth.getUser();
      if (visited && user) {
        router.push("/feed");
        return;
      }
      localStorage.setItem("throughline_visited", "true");
    }
    check();

    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const openSignup = () => { setAuthMode("signup"); setShowAuth(true); };
  const openSignin = () => { setAuthMode("signin"); setShowAuth(true); };

  return (
    <>
      <Head>
        <title>Throughline — Every vote has a price. We show you the receipt.</title>
        <meta name="description" content="Track the money behind every congressional vote. See exactly who funds your representatives — and how they vote for those donors." />
      </Head>

      {/* Mobile swiper — full screen, hides everything else */}
      {isMobile && <MobileSwiper onShowAuth={() => { setAuthMode("signup"); setShowAuth(true); }} />}

      {/* ZIP PROMPT — all screen sizes, logged-in users without ZIP */}
      {user && needsZip && !zipDismissed && (
        <div style={{ maxWidth: 480, margin: "0 auto 24px", padding: "0 24px" }}>
          <ZipPrompt
            context="feed"
            onComplete={async () => { await refreshProfile(); setZipDismissed(true); }}
            onDismiss={() => setZipDismissed(true)}
          />
        </div>
      )}

      {/* Sticky nav — desktop only */}
      {!isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(10,11,13,0.97)" : "transparent",
          borderBottom: scrolled ? "0.5px solid rgba(201,168,76,0.15)" : "none",
          transition: "all 0.3s ease",
          padding: "16px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em", color: "#C9A84C" }}>
            THROUGHLINE
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={() => router.push("/feed")} style={{
              fontFamily: "Arial", fontSize: 13, color: "#9A9488",
              background: "none", border: "none", cursor: "pointer",
            }}>Feed</button>
            <button onClick={openSignin} style={{
              fontFamily: "Arial Black", fontSize: 12, color: "#0A0B0D",
              background: "#C9A84C", border: "none", borderRadius: 4,
              padding: "8px 18px", cursor: "pointer", letterSpacing: "0.06em",
              touchAction: "manipulation",
            }}>SIGN IN</button>
          </div>
        </div>
      )}

      {/* Desktop content */}
      {!isMobile && (
        <>
          {/* HERO */}
          <div style={{
            minHeight: "100vh", background: "#0A0B0D",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "120px 24px 80px", textAlign: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "30%", left: "50%",
              transform: "translateX(-50%)",
              width: 700, height: 400,
              background: "radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", maxWidth: 720 }}>
              <div style={{
                display: "inline-block",
                background: "#C9A84C", color: "#0A0B0D",
                fontFamily: "Arial Black", fontSize: 11,
                letterSpacing: "0.2em", padding: "6px 16px",
                borderRadius: 2, marginBottom: 32,
              }}>
                POLITICAL TRANSPARENCY
              </div>

              <h1 style={{
                fontFamily: "Arial Black",
                fontSize: "clamp(44px, 9vw, 88px)",
                color: "#F0ECE4", lineHeight: 1.05,
                margin: "0 0 8px", letterSpacing: "-0.02em",
              }}>
                Every vote
              </h1>
              <h1 style={{
                fontFamily: "Arial Black",
                fontSize: "clamp(44px, 9vw, 88px)",
                color: "#C9A84C", lineHeight: 1.05,
                margin: "0 0 32px", letterSpacing: "-0.02em",
              }}>
                has a price.
              </h1>

              <p style={{
                fontFamily: "Arial", fontSize: "clamp(15px, 2vw, 18px)",
                color: "#9A9488", lineHeight: 1.8,
                maxWidth: 540, margin: "0 auto 48px",
              }}>
                Track the money behind every congressional vote.
                See exactly who funds your representatives —
                and how they vote for those donors.
              </p>

              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => router.push("/quiz")} style={{
                  fontFamily: "Arial Black", fontSize: 16, color: "#0A0B0D",
                  background: "#C9A84C", border: "none", borderRadius: 4,
                  padding: "18px 44px", cursor: "pointer",
                  letterSpacing: "0.04em", touchAction: "manipulation",
                  boxShadow: "0 0 40px rgba(201,168,76,0.25)",
                }}>TAKE THE QUIZ →</button>
                <button onClick={() => router.push("/feed")} style={{
                  fontFamily: "Arial Black", fontSize: 14, color: "#C9A84C",
                  background: "transparent",
                  border: "1.5px solid rgba(201,168,76,0.4)",
                  borderRadius: 4, padding: "18px 32px",
                  cursor: "pointer", letterSpacing: "0.04em",
                  touchAction: "manipulation",
                }}>EXPLORE POLITICIANS</button>
              </div>

              <p style={{
                fontFamily: "Arial", fontSize: 12, color: "#9A9488",
                marginTop: 20, opacity: 0.6,
              }}>
                Free · No credit card · Takes 5 minutes
              </p>
            </div>

            <div style={{
              position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              animation: "bounce 2s ease-in-out infinite",
            }}>
              <div style={{ fontFamily: "Arial", fontSize: 10, color: "#9A9488", letterSpacing: "0.15em" }}>SCROLL</div>
              <div style={{ color: "#C9A84C", fontSize: 16 }}>↓</div>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div style={{
            background: "#111318", padding: "100px 24px",
            borderTop: "0.5px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ maxWidth: 1000, margin: "0 auto" }}>
              <div style={{
                fontFamily: "Arial Black", fontSize: 11,
                letterSpacing: "0.3em", color: "#C9A84C",
                marginBottom: 60, textAlign: "center",
              }}>HOW IT WORKS</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 24,
              }}>
                {[
                  { icon: "🗳️", title: "Take the Quiz", body: "Answer 12 real-world scenarios. Get your Political Thumbprint mapped across 12 policy dimensions. No jargon. No labels." },
                  { icon: "🏛️", title: "Meet Your Reps", body: "See which members of Congress actually vote like you — and which ones vote for their donors instead." },
                  { icon: "💰", title: "Follow the Money", body: "Every PAC donation mapped to every vote. The receipts don't lie. We show you exactly who paid for what." },
                ].map((card, i) => (
                  <div key={i} style={{
                    background: "#181C22",
                    border: "0.5px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, padding: "36px 28px",
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 16 }}>{card.icon}</div>
                    <div style={{
                      fontFamily: "Arial Black", fontSize: 18,
                      color: "#F0ECE4", marginBottom: 12,
                    }}>{card.title}</div>
                    <div style={{
                      fontFamily: "Arial", fontSize: 14,
                      color: "#9A9488", lineHeight: 1.75,
                    }}>{card.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM CTA */}
          <div style={{
            background: "#0A0B0D", padding: "120px 24px",
            textAlign: "center",
            borderTop: "0.5px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <h2 style={{
                fontFamily: "Arial Black",
                fontSize: "clamp(32px, 6vw, 64px)",
                color: "#F0ECE4", margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}>Every vote has a price.</h2>
              <div style={{
                width: 60, height: 3, background: "#C9A84C",
                margin: "24px auto",
              }} />
              <h2 style={{
                fontFamily: "Arial Black",
                fontSize: "clamp(32px, 6vw, 64px)",
                color: "#C9A84C", margin: "0 0 48px",
                letterSpacing: "-0.02em",
              }}>We show you the receipt.</h2>
              <button onClick={openSignup} style={{
                fontFamily: "Arial Black", fontSize: 16, color: "#0A0B0D",
                background: "#C9A84C", border: "none", borderRadius: 4,
                padding: "18px 52px", cursor: "pointer",
                letterSpacing: "0.04em", touchAction: "manipulation",
                boxShadow: "0 0 60px rgba(201,168,76,0.2)",
              }}>START FOR FREE →</button>
              <p style={{
                fontFamily: "Arial", fontSize: 12, color: "#9A9488",
                marginTop: 16, opacity: 0.6,
              }}>No credit card required</p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            background: "#0A0B0D", borderTop: "0.5px solid rgba(255,255,255,0.05)",
            padding: "24px 32px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}>
            <div style={{ fontFamily: "Arial Black", fontSize: 11, letterSpacing: "0.2em", color: "#C9A84C" }}>
              THROUGHLINE
            </div>
            <div style={{ fontFamily: "Arial", fontSize: 11, color: "#9A9488" }}>
              throughlinenews.org · Every vote has a price.
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>

      {showAuth && (
        <AuthModal
          message={authMode === "signup" ? "Create your free account" : "Sign in to Throughline"}
          onDismiss={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
