// components/BeliefQuestionCard.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

const RESPONSES = [
  { label: "Strongly Agree",    value: "strongly_agree" },
  { label: "Agree",             value: "agree" },
  { label: "Neutral",           value: "neutral" },
  { label: "Disagree",          value: "disagree" },
  { label: "Strongly Disagree", value: "strongly_disagree" },
];

const T = {
  bg: "#11131a",
  border: "rgba(201,168,76,0.15)",
  borderHover: "rgba(201,168,76,0.4)",
  gold: "#c9a84c",
  text: "#e8dfc8",
  text2: "#a89d88",
  dark: "#0a0b0d",
};

// Shared session counter across all instances of this component
// Resets on page reload — no DB needed
let sessionAnswerCount = 0;

export default function BeliefQuestionCard({ user, profile }) {
  const { setShowAuthModal } = useAuth();
  const router = useRouter();

  const [question,         setQuestion]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [answered,         setAnswered]         = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [error,            setError]            = useState(null);
  const [showAuthNudge,    setShowAuthNudge]    = useState(false);
  const [showThumbprint,   setShowThumbprint]   = useState(false);
  const [sessionCount,     setSessionCount]     = useState(sessionAnswerCount);
  const [chaining,         setChaining]         = useState(false);
  const [lastDimension,    setLastDimension]    = useState(null);

  const fetchQuestion = (overrideUserId, preferDimension) => {
    setLoading(true);
    setQuestion(null);
    setError(null);
    const uid = overrideUserId ?? user?.id;
    let url = uid ? `/api/belief-question?user_id=${uid}` : `/api/belief-question`;
    if (preferDimension) url += `${uid ? "&" : "?"}prefer_dimension=${preferDimension}`;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (data.error) setError(data.error);
        setQuestion(data.question || null);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    fetchQuestion();
  }, [user?.id]);

  const handleAnswer = async (value) => {
    if (answered || selectedResponse) return;
    setSelectedResponse(value);

    if (!user?.id) {
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
        sessionAnswerCount += 1;
        setSessionCount(sessionAnswerCount);
        setLastDimension(question.dimension);
        setAnswered(true);

        // Show thumbprint message every 3 answers
        if (sessionAnswerCount % 3 === 0) {
          setShowThumbprint(true);
          setTimeout(() => setShowThumbprint(false), 3000);
        }
      }
    } catch (_) {
      setAnswered(true);
      sessionAnswerCount += 1;
      setSessionCount(sessionAnswerCount);
    }
  };

  const handleAnswerAnother = () => {
    setAnswered(false);
    setSelectedResponse(null);
    setChaining(true);
    fetchQuestion(user?.id, lastDimension);
  };

  const quizCta = () => {
    if (!profile?.quiz_completed) {
      return { label: "TAKE THE QUIZ →", href: "/quiz" };
    }
    if ((profile?.quiz_level ?? 0) < 2) {
      return { label: "CONTINUE TO LEVEL 2 →", href: "/quiz" };
    }
    return { label: "VIEW YOUR THUMBPRINT →", href: "/quiz" };
  };

  if (loading) return null;
  if (error) return null;
  if (!question && !answered) return null;

  // After 3 session answers, show quiz prompt instead of chaining further
  if (answered && sessionCount >= 3) {
    const cta = quizCta();
    return (
      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: "0.2em", color: T.text2, textTransform: "uppercase" }}>
            Your Daily Question
          </span>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 16, color: T.gold, marginBottom: 8 }}>
          Your thumbprint is evolving.
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: T.text2, marginBottom: 20, lineHeight: 1.5 }}>
          You've answered {sessionCount} questions this session. Keep going to sharpen your political identity.
        </div>
        <button
          onClick={() => router.push(cta.href)}
          style={{
            background: T.gold, border: "none", color: T.dark,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 13, letterSpacing: "0.1em", padding: "10px 20px",
            borderRadius: 4, cursor: "pointer",
          }}
        >
          {cta.label}
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: "0.2em", color: T.text2, textTransform: "uppercase" }}>
            Your Daily Question
          </span>
        </div>
        {question && (
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: T.text2 }}>
            {[question.category, question.sub_issue].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      {/* Question text */}
      {question && (
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: T.text, marginTop: 16, lineHeight: 1.4 }}>
          {question.question_text}
        </div>
      )}

      {/* Answered state */}
      {answered ? (
        <div style={{ marginTop: 20 }}>
          {showThumbprint && (
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 14, color: T.gold, marginBottom: 12 }}>
              Your thumbprint is evolving.
            </div>
          )}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: T.text2, marginBottom: 16 }}>
            Answer saved.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleAnswerAnother}
              style={{
                background: T.gold, border: "none", color: T.dark,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 12, letterSpacing: "0.08em", padding: "8px 16px",
                borderRadius: 4, cursor: "pointer",
              }}
            >
              ANSWER ANOTHER
            </button>
            <button
              onClick={() => setAnswered(true)}
              style={{
                background: "transparent", border: `1px solid ${T.border}`, color: T.text2,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
                letterSpacing: "0.08em", padding: "8px 16px",
                borderRadius: 4, cursor: "pointer",
              }}
            >
              DONE FOR NOW
            </button>
          </div>
        </div>
      ) : showAuthNudge ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: T.text2, marginBottom: 14 }}>
            Sign in to save your answers and track your political profile.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowAuthModal(true)} style={{ background: T.gold, border: "none", color: T.dark, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>
              SIGN IN
            </button>
            <button onClick={() => setShowAuthModal(true)} style={{ background: "transparent", border: `1px solid ${T.borderHover}`, color: T.text2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: "0.08em", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>
              CREATE ACCOUNT
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
          {RESPONSES.map(({ label, value }) => {
            const isSelected = selectedResponse === value;
            return (
              <button
                key={value}
                onClick={() => handleAnswer(value)}
                style={{
                  background: isSelected ? T.gold : T.dark,
                  border: `1px solid ${isSelected ? T.gold : T.border}`,
                  color: isSelected ? T.dark : T.text2,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12, padding: "8px 12px", borderRadius: 4,
                  cursor: selectedResponse ? "default" : "pointer",
                  letterSpacing: "0.04em", transition: "all 0.15s ease",
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
