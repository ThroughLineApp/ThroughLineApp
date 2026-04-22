import { useState, useEffect } from "react";
import supabase from "../lib/supabase";

const C = {
  bg:      "#0a0b0d",
  surface: "#111318",
  gold:    "#c9a84c",
  text:    "#f0ece4",
  text2:   "#9a9488",
  border:  "rgba(255,255,255,0.08)",
};

const SCROLLBAR_HIDE = `
  .election-strip::-webkit-scrollbar { display: none; }
`;

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ElectionCountdown() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("elections")
      .select("id, name, election_type, election_date, state, notes")
      .gte("election_date", today)
      .order("election_date", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setElections(data);
        setLoading(false);
      });
  }, []);

  if (loading || elections.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{SCROLLBAR_HIDE}</style>

      {/* Section label */}
      <div style={{
        fontFamily: "Arial Black",
        fontSize: 10,
        letterSpacing: "0.22em",
        color: C.text2,
        textTransform: "uppercase",
        marginBottom: 10,
      }}>
        Election Countdown
      </div>

      {/* Scrollable strip */}
      <div
        className="election-strip"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingBottom: 2,
        }}
      >
        {elections.map((el) => {
          const days = daysUntil(el.election_date);
          return (
            <div
              key={el.id}
              style={{
                flexShrink: 0,
                background: C.surface,
                border: "0.5px solid rgba(201,168,76,0.2)",
                borderRadius: 12,
                padding: "14px 16px",
                minWidth: 148,
                maxWidth: 188,
              }}
            >
              {/* Days remaining — big gold number */}
              <div style={{
                fontFamily: "Arial Black",
                fontSize: 40,
                color: C.gold,
                lineHeight: 1,
                marginBottom: 2,
              }}>
                {days}
              </div>
              <div style={{
                fontFamily: "Arial",
                fontSize: 9,
                color: C.text2,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}>
                {days === 1 ? "day away" : "days away"}
              </div>

              {/* Election name */}
              <div style={{
                fontFamily: "Arial Black",
                fontSize: 12,
                color: C.text,
                lineHeight: 1.3,
                marginBottom: 4,
              }}>
                {el.name}
              </div>

              {/* State + date */}
              <div style={{
                fontFamily: "Arial",
                fontSize: 11,
                color: C.gold,
                marginBottom: 2,
              }}>
                {el.state || "National"}
              </div>
              <div style={{
                fontFamily: "Arial",
                fontSize: 10,
                color: C.text2,
              }}>
                {formatDate(el.election_date)}
              </div>

              {/* Notes — only if present */}
              {el.notes && (
                <div style={{
                  fontFamily: "Arial",
                  fontSize: 10,
                  color: C.text2,
                  lineHeight: 1.5,
                  borderTop: `0.5px solid ${C.border}`,
                  paddingTop: 6,
                  marginTop: 8,
                }}>
                  {el.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
