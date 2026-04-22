import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Nav from "../components/Nav";
import ElectionCountdown from "../components/ElectionCountdown";
import EventCard from "../components/EventCard";
import EventSubmitModal from "../components/EventSubmitModal";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";

const C = {
  bg:      "#0a0b0d",
  surface: "#111318",
  gold:    "#c9a84c",
  text:    "#f0ece4",
  text2:   "#9a9488",
  border:  "rgba(255,255,255,0.08)",
};

const EVENT_TYPES = [
  { value: "rally",      label: "Rally" },
  { value: "town_hall",  label: "Town Hall" },
  { value: "voter_reg",  label: "Voter Reg" },
  { value: "phone_bank", label: "Phone Bank" },
  { value: "canvass",    label: "Canvassing" },
  { value: "speaker",    label: "Speaker" },
];

const GLOBAL_STYLES = `
  * { box-sizing: border-box; }
  body { background: #0a0b0d; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [filtersReady, setFiltersReady]   = useState(false);
  const [showSubmit, setShowSubmit]       = useState(false);
  const debounceRef = useRef(null);

  // Load user's saved filter preferences on mount
  useEffect(() => {
    const init = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("followed_event_types")
          .eq("id", user.id)
          .single();
        if (data?.followed_event_types?.length > 0) {
          setSelectedTypes(data.followed_event_types);
        }
      }
      setFiltersReady(true);
    };
    init();
  }, [user]);

  // Fetch events once filters are ready, re-fetch when they change
  useEffect(() => {
    if (!filtersReady) return;
    fetchEvents(selectedTypes);
  }, [filtersReady, selectedTypes]);

  const fetchEvents = async (types = selectedTypes) => {
    setLoading(true);
    const now = new Date().toISOString();
    let query = supabase
      .from("events")
      .select("*")
      .eq("is_visible", true)
      .gte("event_date", now)
      .or("flag_count.is.null,flag_count.lt.5")
      .order("event_date", { ascending: true });

    if (types.length > 0) {
      query = query.in("event_type", types);
    }

    const { data } = await query;
    setEvents(data || []);
    setLoading(false);
  };

  const toggleType = (value) => {
    const next = selectedTypes.includes(value)
      ? selectedTypes.filter(v => v !== value)
      : [...selectedTypes, value];
    setSelectedTypes(next);

    if (user) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await supabase
          .from("profiles")
          .update({ followed_event_types: next })
          .eq("id", user.id);
      }, 800);
    }
  };

  return (
    <>
      <Head><title>Events — Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Arial" }}>
        <Nav />
        <div style={{
          maxWidth: 600, margin: "0 auto",
          padding: "48px 20px 80px",
          animation: "fadeIn 0.4s ease forwards",
        }}>

          {/* ── PAGE HEADER ── */}
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 32,
          }}>
            <div>
              <div style={{
                fontFamily: "Arial Black",
                fontSize: "clamp(28px, 6vw, 36px)",
                color: C.text,
                letterSpacing: "0.02em",
                lineHeight: 1.1,
                marginBottom: 7,
              }}>
                EVENTS
              </div>
              <div style={{ width: 48, height: 3, background: C.gold, borderRadius: 2 }} />
            </div>
            <button
              onClick={() => setShowSubmit(true)}
              style={{
                fontFamily: "Arial Black",
                fontSize: 11,
                letterSpacing: "0.07em",
                padding: "10px 18px",
                borderRadius: 10,
                background: C.gold,
                color: "#0a0b0d",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                marginTop: 4,
              }}
            >
              + SUBMIT EVENT
            </button>
          </div>

          {/* ── ELECTION COUNTDOWN ── */}
          <ElectionCountdown />

          {/* ── FILTER BAR ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "Arial Black",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: C.text2,
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              Filter by Type
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {EVENT_TYPES.map(t => {
                const active = selectedTypes.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleType(t.value)}
                    style={{
                      fontFamily: "Arial",
                      fontSize: 12,
                      padding: "6px 14px",
                      borderRadius: 20,
                      cursor: "pointer",
                      background: active ? "rgba(201,168,76,0.18)" : C.surface,
                      color: active ? C.gold : C.text2,
                      border: `1px solid ${active ? C.gold + "66" : C.border}`,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
              {selectedTypes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTypes([])}
                  style={{
                    fontFamily: "Arial",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 20,
                    cursor: "pointer",
                    background: "transparent",
                    color: C.text2,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── EVENT GRID ── */}
          {loading ? (
            <div style={{
              fontFamily: "Arial", fontSize: 13,
              color: C.text2, textAlign: "center",
              padding: "40px 0",
            }}>
              Loading events…
            </div>
          ) : events.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "48px 24px",
              background: C.surface,
              borderRadius: 16,
              border: `0.5px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
              <div style={{
                fontFamily: "Arial Black",
                fontSize: 15,
                color: C.text,
                marginBottom: 8,
              }}>
                No events found
              </div>
              <div style={{
                fontFamily: "Arial",
                fontSize: 13,
                color: C.text2,
                lineHeight: 1.6,
                marginBottom: 20,
              }}>
                {selectedTypes.length > 0
                  ? "No events match your current filters."
                  : "Be the first to add one."}
              </div>
              <button
                onClick={() => setShowSubmit(true)}
                style={{
                  fontFamily: "Arial Black",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  padding: "10px 22px",
                  borderRadius: 10,
                  background: C.gold,
                  color: "#0a0b0d",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                + SUBMIT EVENT
              </button>
            </div>
          ) : (
            <div>
              {events.map(ev => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── SUBMIT MODAL ── */}
      {showSubmit && (
        <EventSubmitModal
          onDismiss={() => setShowSubmit(false)}
          onSuccess={() => fetchEvents(selectedTypes)}
        />
      )}
    </>
  );
}
