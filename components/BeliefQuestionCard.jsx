// components/BeliefQuestionCard.jsx
// Self-contained card that fetches one unanswered belief engine question,
// lets the user answer inline, and saves the response to Supabase.
// Logged-out users see the question but get a sign-in nudge on answer.

import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import supabase from "../lib/supabase";

const RESPONSES = [
  { label: "Strongly Agree",    value: "strongly_agree" },
  { label: "Agree",             value: "agree" },
  { label: "Neutral",           value: "neutral" },
  { label: "Disagree",          value: "disagree" },
  { label: "Strongly Disagree", value: "strongly_disagree" },
];

export default function BeliefQuestionCard({ user }) {
  const { setShowAuthModal } = useAuth();
  const [question,         setQuestion]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [answered,         setAnswered]         = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [error,            setError]            = useState(null);
  const [showAuthNudge,    setShowAuthNudge]    = useState(false);
  const [showThumbprint,   setShowThumbprint]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // user_id optional — logged-out users get an unfiltered question
    const url = user?.id
      ? `/api/belief-question?user_id=${user.id}`
      : `/api/belief-question`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        setQuestion(data.question || null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleAnswer = async (value) => {
    if (answered || selectedResponse) return;
    setSelectedResponse(value);

    if (!user?.id) {
      // Logged-out: show sign-in nudge instead of saving
      setShowAuthNudge(true);
      return;
    }

    try {
      const res = await fetch("/api/belief-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, question_id: question.id, response: value }),
      });
      const data = await res.json();
      if (data.success) {
        setAnswered(true);
        // On every 3rd total response, show the thumbprint-evolving message
        const { count } = await supabase
          .from("user_question_responses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (count && count % 3 === 0) {
          setShowThumbprint(true);
          setTimeout(() => setShowThumbprint(false), 2500);
        }
      }
    } catch (_) {
      // fire-and-forget — UI already shows selected state
      setAnswered(true);
    }
  };

  if (loading) return null;
  if (error) return null;
  if (!question) return null;

  return (
    <div style={{
      background: "#11131a",
      border: "1px solid rgba(201,168,76,0.15)",
      borderRadius: 8,
      padding: 20,
      marginBottom: 16,
    }}>
      {/* Top label row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#c9a84c", flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, letterSpacing: "0.2em",
            color: "#9A9488", textTransform: "uppercase",
          }}>Your Daily Question</span>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: "#9A9488",
        }}>
          {[question.category, question.sub_issue].filter(Boolean).join(" · ")}
        </span>
      </div>

      {/* Question text */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic",
        fontSize: 18, color: "#e8dfc8",
        marginTop: 16, lineHeight: 1.4,
      }}>
        {question.question_text}
      </div>

      {/* Response buttons, answered state, or auth nudge */}
      {answered ? (
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 12, color: "#9A9488",
            fontStyle: "italic",
          }}>
            Answer saved. Come back tomorrow for your next question.
          </div>
          {showThumbprint && (
            <div style={{
              marginTop: 12,
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "#c9a84c",
              textAlign: "center",
              animation: "beliefFadeOut 2.5s ease forwards",
            }}>
              Your thumbprint is evolving.
              <style>{`
                @keyframes beliefFadeOut {
                  0%   { opacity: 1; }
                  70%  { opacity: 1; }
                  100% { opacity: 0; }
                }
              `}</style>
            </div>
          )}
        </div>
      ) : showAuthNudge ? (
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 12, color: "#9A9488",
            fontStyle: "italic",
            marginBottom: 14,
          }}>
            Sign in to save your answers and track your political profile.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: "#c9a84c",
                border: "none",
                color: "#0a0b0d",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: "transparent",
                border: "1px solid rgba(201,168,76,0.4)",
                color: "#9A9488",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                letterSpacing: "0.08em",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              CREATE ACCOUNT
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          marginTop: 20,
        }}>
          {RESPONSES.map(({ label, value }) => {
            const isSelected = selectedResponse === value;
            return (
              <button
                key={value}
                onClick={() => handleAnswer(value)}
                style={{
                  background: isSelected ? "#c9a84c" : "#0a0b0d",
                  border: `1px solid ${isSelected ? "#c9a84c" : "rgba(201,168,76,0.15)"}`,
                  color: isSelected ? "#0a0b0d" : "#a89d88",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 4,
                  cursor: selectedResponse ? "default" : "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
