import { useState, useEffect } from "react";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";

const C = {
  surface:  "#111318",
  surface2: "#181c22",
  gold:     "#c9a84c",
  text:     "#f0ece4",
  text2:    "#9a9488",
  green:    "#4caf7d",
  red:      "#e05c4b",
  blue:     "#5b9cf6",
  border:   "rgba(255,255,255,0.08)",
};

const TYPE_COLORS = {
  rally:        "#c9a84c",
  town_hall:    "#5b9cf6",
  voter_reg:    "#4caf7d",
  phone_bank:   "#9b8ff5",
  canvass:      "#4cc9c9",
  speaker:      "#c98e4c",
  election_day: "#c9a84c",
  primary:      "#c9a84c",
};

const TYPE_LABELS = {
  rally:        "Rally",
  town_hall:    "Town Hall",
  voter_reg:    "Voter Reg",
  phone_bank:   "Phone Bank",
  canvass:      "Canvassing",
  speaker:      "Speaker / Forum",
  election_day: "Election Day",
  primary:      "Primary",
};

const DIM_LABELS = {
  economic:"Economic", healthcare:"Healthcare", climate:"Climate",
  criminal:"Criminal Justice", immigration:"Immigration", foreign:"Foreign Policy",
  education:"Education", freedom:"Personal Freedom", guns:"Gun Policy",
  housing:"Housing", tech:"Tech & Privacy", voting:"Voting Rights",
};

function daysAway(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatEventDate(dateStr) {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export default function EventCard({ event }) {
  const { user, requireAuth } = useAuth();
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagMsg, setFlagMsg] = useState(null);

  // Check if already saved
  useEffect(() => {
    if (!user) return;
    supabase
      .from("event_saves")
      .select("event_id")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setSaved(true); });
  }, [user, event.id]);

  const handleSave = async () => {
    if (!user) { requireAuth("Sign in to save events and get reminders."); return; }
    if (saved || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("event_saves")
      .insert({ user_id: user.id, event_id: event.id });
    if (!error) setSaved(true);
    setSaving(false);
  };

  const handleFlag = async () => {
    if (!user) { requireAuth("Sign in to report events."); return; }
    if (flagged) return;

    const { error: flagError } = await supabase
      .from("event_flags")
      .insert({ user_id: user.id, event_id: event.id });

    if (flagError) {
      setFlagMsg("Already reported");
      setTimeout(() => setFlagMsg(null), 2500);
      return;
    }

    // Increment flag_count
    const { data: current } = await supabase
      .from("events")
      .select("flag_count")
      .eq("id", event.id)
      .single();
    await supabase
      .from("events")
      .update({ flag_count: (current?.flag_count || 0) + 1 })
      .eq("id", event.id);

    setFlagged(true);
    setFlagMsg("Reported");
    setTimeout(() => setFlagMsg(null), 2500);
  };

  const typeColor  = TYPE_COLORS[event.event_type]  || C.text2;
  const typeLabel  = TYPE_LABELS[event.event_type]  || event.event_type;
  const days       = daysAway(event.event_date);
  const isExternal = event.source === "facebook" || event.source === "mobilize";
  const dims       = event.policy_dimensions || [];

  return (
    <div style={{
      background: C.surface,
      border: `0.5px solid ${C.border}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      position: "relative",
    }}>

      {/* ── TOP ROW: type badge + optional source badge ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "Arial Black",
          fontSize: 9,
          letterSpacing: "0.12em",
          padding: "3px 9px",
          borderRadius: 20,
          background: typeColor + "22",
          color: typeColor,
          border: `1px solid ${typeColor}44`,
        }}>
          {typeLabel.toUpperCase()}
        </span>
        {isExternal && (
          <span style={{
            fontFamily: "Arial",
            fontSize: 9,
            letterSpacing: "0.08em",
            padding: "3px 9px",
            borderRadius: 20,
            background: C.surface2,
            color: C.text2,
            border: `0.5px solid ${C.border}`,
            textTransform: "uppercase",
          }}>
            {event.source}
          </span>
        )}
      </div>

      {/* ── TITLE ── */}
      <div style={{ marginBottom: 8 }}>
        {isExternal && event.url ? (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "Arial Black",
              fontSize: 15,
              color: C.text,
              lineHeight: 1.25,
              textDecoration: "none",
              borderBottom: `1px solid ${C.gold}44`,
            }}
          >
            {event.title} ↗
          </a>
        ) : (
          <div style={{
            fontFamily: "Arial Black",
            fontSize: 15,
            color: C.text,
            lineHeight: 1.25,
          }}>
            {event.title}
          </div>
        )}
      </div>

      {/* ── DATE + DAYS AWAY ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "Arial", fontSize: 12, color: C.text2, marginBottom: 2 }}>
          {formatEventDate(event.event_date)}
        </div>
        {days >= 0 && (
          <div style={{
            fontFamily: "Arial Black",
            fontSize: 11,
            color: C.gold,
            letterSpacing: "0.04em",
          }}>
            {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days away`}
          </div>
        )}
      </div>

      {/* ── LOCATION ── */}
      {(event.location_name || event.zip_code) && (
        <div style={{
          fontFamily: "Arial",
          fontSize: 12,
          color: C.text2,
          marginBottom: 10,
        }}>
          {[event.location_name, event.zip_code].filter(Boolean).join(" · ")}
        </div>
      )}

      {/* ── POLICY DIMENSION PILLS ── */}
      {dims.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
          {dims.map(dim => (
            <span key={dim} style={{
              fontFamily: "Arial",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: C.surface2,
              color: C.text2,
              border: `0.5px solid ${C.border}`,
            }}>
              {DIM_LABELS[dim] || dim}
            </span>
          ))}
        </div>
      )}

      {/* ── FOOTER: Save + Flag ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `0.5px solid ${C.border}`,
        paddingTop: 12,
      }}>
        {/* Save / RSVP */}
        <button
          onClick={handleSave}
          style={{
            fontFamily: "Arial Black",
            fontSize: 11,
            letterSpacing: "0.06em",
            padding: "7px 16px",
            borderRadius: 8,
            cursor: saved ? "default" : "pointer",
            background: saved ? C.green + "18" : C.gold,
            color: saved ? C.green : "#0a0b0d",
            border: saved ? `1px solid ${C.green}44` : "none",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saved ? "SAVED ✓" : saving ? "SAVING…" : "SAVE / RSVP"}
        </button>

        {/* Flag button */}
        <div style={{ position: "relative" }}>
          {flagMsg && (
            <span style={{
              position: "absolute",
              right: 28,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "Arial",
              fontSize: 10,
              color: C.text2,
              whiteSpace: "nowrap",
              background: C.surface2,
              padding: "3px 8px",
              borderRadius: 6,
              border: `0.5px solid ${C.border}`,
            }}>
              {flagMsg}
            </span>
          )}
          <button
            onClick={handleFlag}
            title="Report this event"
            style={{
              background: "none",
              border: "none",
              cursor: flagged ? "default" : "pointer",
              fontSize: 14,
              color: flagged ? C.red : C.text2,
              padding: "4px",
              opacity: flagged ? 0.5 : 1,
              lineHeight: 1,
            }}
          >
            ⚑
          </button>
        </div>
      </div>
    </div>
  );
}
