import Head from "next/head";
import { useRouter } from "next/router";
import Nav from "../components/Nav";

export default function NewsPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>News — Throughline</title>
      </Head>
      <div style={{ background: "#0a0b0d", minHeight: "100vh" }}>
        <Nav />
        <div style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "80px 24px 120px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>
          {/* Wordmark */}
          <div style={{
            fontFamily: "Arial Black, sans-serif",
            fontSize: 13,
            letterSpacing: "0.25em",
            color: "#c9a84c",
            marginBottom: 48,
          }}>THROUGHLINE</div>

          {/* Icon */}
          <svg
            width={52} height={52} viewBox="0 0 24 24" fill="none"
            style={{ marginBottom: 28, opacity: 0.5 }}
          >
            <path
              d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a4 4 0 01-4-4V6"
              stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
            <line x1="10" y1="7"  x2="18" y2="7"  stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="11" x2="18" y2="11" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="15" x2="16" y2="15" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          {/* Heading */}
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 26,
            color: "#e8dfc8",
            lineHeight: 1.3,
            marginBottom: 14,
          }}>News is coming soon.</div>

          {/* Subtext */}
          <div style={{
            fontFamily: "Figtree, sans-serif",
            fontSize: 13,
            color: "#a89d88",
            lineHeight: 1.6,
            maxWidth: 320,
            marginBottom: 40,
          }}>
            Curated civic journalism matched to the issues you follow.
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push("/")}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              letterSpacing: "0.15em",
              color: "#c9a84c",
              background: "none",
              border: "1px solid rgba(201,168,76,0.35)",
              borderRadius: 4,
              padding: "9px 24px",
              cursor: "pointer",
            }}
          >← BACK TO FEED</button>
        </div>
      </div>
    </>
  );
}
