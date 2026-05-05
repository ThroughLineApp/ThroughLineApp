// components/BeliefQuestionCard.jsx
// Self-contained card that fetches one unanswered belief engine question,
// lets the user answer inline, and saves the response to Supabase.

import { useState, useEffect } from "react";

const RESPONSES = [
  { label: "Strongly Agree",    value: "strongly_agree" },
  { label: "Agree",             value: "agree" },
  { label: "Neutral",           value: "neutral" },
  { label: "Disagree",          value: "disagree" },
  { label: "Strongly Disagree", value: "strongly_disagree" },
];

export default function BeliefQuestionCard({ userId }) {
  const [question,         setQuestion]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [answered,         setAnswered]         = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [error,            setError]            = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    fetch(`/api/belief-question?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        setQuestion(data.question || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  const handleAnswer = async (value) => {
    if (answered || selectedResponse) return;
    setSelectedResponse(value);

    try {
      const res = await fetch("/api/belief-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, question_id: question.id, response: value }),
      });
      const data = await res.json();
      if (data.success) setAnswered(true);
    } catch (_) {
      // fire-and-forget — UI already shows selected state
      setAnswered(true);
    }
  };

  if (loading) return null;
  if (error) return (
    <div style={{ background: "#11131a", border: "1px solid #c94c4c", borderRadius: 8, padding: 20, marginBottom: 16, color: "#c94c4c", fontFamily: "monospace", fontSize: 12 }}>
      Belief card error: {error}
    </div>
  );
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

      {/* Response buttons or answered state */}
      {answered ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'DM Mono', monospace",
          fontSize: 12, color: "#9A9488",
          fontStyle: "italic",
        }}>
          Answer saved. Come back tomorrow for your next question.
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
