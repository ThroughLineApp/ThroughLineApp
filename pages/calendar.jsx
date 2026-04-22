import { useState, useEffect } from "react";
import Head from "next/head";
import Nav from "../components/Nav";
import supabase from "../lib/supabase";

const C = {
  bg:      "#0a0b0d",
  surface: "#111318",
  surface2:"#181c22",
  gold:    "#c9a84c",
  text:    "#f0ece4",
  text2:   "#9a9488",
  blue:    "#5b9cf6",
  border:  "rgba(255,255,255,0.08)",
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

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const GLOBAL_STYLES = `
  * { box-sizing: border-box; }
  body { background: #0a0b0d; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildCalendarGrid(year, month, events, elections) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = {};
  events.forEach(ev => {
    const d = new Date(ev.event_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });
  const electionsByDay = {};
  elections.forEach(el => {
    const d = new Date(el.election_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!electionsByDay[day]) electionsByDay[day] = [];
      electionsByDay[day].push(el);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      date: new Date(year, month, day),
      events: eventsByDay[day] || [],
      elections: electionsByDay[day] || [],
    });
  }
  return cells;
}

export default function CalendarPage() {
  const today = new Date();
  const [year,  setYear]      = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [events, setEvents]   = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetchMonth(year, month);
    setSelectedDay(null);
  }, [year, month]);

  const fetchMonth = async (y, m) => {
    setLoading(true);
    const monthStart = new Date(y, m, 1).toISOString();
    const monthEnd   = new Date(y, m + 1, 0, 23, 59, 59).toISOString();

    const [{ data: evData }, { data: elData }] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, event_type, event_date, location_name, zip_code, url")
        .eq("is_visible", true)
        .gte("event_date", monthStart)
        .lte("event_date", monthEnd)
        .or("flag_count.is.null,flag_count.lt.5")
        .order("event_date", { ascending: true }),
      supabase
        .from("elections")
        .select("id, name, election_type, election_date, state")
        .gte("election_date", monthStart.split("T")[0])
        .lte("election_date", monthEnd.split("T")[0])
        .order("election_date", { ascending: true }),
    ]);

    setEvents(evData || []);
    setElections(elData || []);
    setLoading(false);
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const cells = buildCalendarGrid(year, month, events, elections);
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <>
      <Head><title>Calendar — Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Arial" }}>
        <Nav />
        <div style={{
          maxWidth: 600, margin: "0 auto",
          padding: "48px 20px 80px",
          animation: "fadeIn 0.4s ease forwards",
        }}>

          {/* ── PAGE HEADER ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: "Arial Black",
              fontSize: "clamp(28px, 6vw, 36px)",
              color: C.text,
              letterSpacing: "0.02em",
              lineHeight: 1.1,
              marginBottom: 7,
            }}>
              CALENDAR
            </div>
            <div style={{ width: 48, height: 3, background: C.gold, borderRadius: 2 }} />
          </div>

          {/* ── MONTH NAV ── */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <button
              onClick={prevMonth}
              style={{
                background: C.surface, border: `0.5px solid ${C.border}`,
                borderRadius: 8, color: C.text2,
                padding: "8px 14px", cursor: "pointer",
                fontFamily: "Arial Black", fontSize: 14,
              }}
            >
              ‹
            </button>
            <div style={{
              fontFamily: "Arial Black",
              fontSize: 16,
              color: C.text,
              letterSpacing: "0.04em",
            }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button
              onClick={nextMonth}
              style={{
                background: C.surface, border: `0.5px solid ${C.border}`,
                borderRadius: 8, color: C.text2,
                padding: "8px 14px", cursor: "pointer",
                fontFamily: "Arial Black", fontSize: 14,
              }}
            >
              ›
            </button>
          </div>

          {/* ── DOW HEADERS ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: 3, marginBottom: 3,
          }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} style={{
                textAlign: "center",
                fontFamily: "Arial Black",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: C.text2,
                padding: "4px 0",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* ── CALENDAR GRID ── */}
          {loading ? (
            <div style={{
              fontFamily: "Arial", fontSize: 13,
              color: C.text2, textAlign: "center",
              padding: "40px 0",
            }}>
              Loading…
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 3,
              marginBottom: 24,
            }}>
              {cells.map((cell, i) => {
                if (!cell) {
                  return <div key={`blank-${i}`} />;
                }

                const cellKey = `${year}-${month}-${cell.day}`;
                const isToday = cellKey === todayKey;
                const hasElection = cell.elections.length > 0;
                const hasEvent = cell.events.length > 0;
                const isSelected = selectedDay?.day === cell.day;

                return (
                  <div
                    key={cellKey}
                    onClick={() => setSelectedDay(isSelected ? null : cell)}
                    style={{
                      minHeight: 52,
                      borderRadius: 8,
                      padding: "6px 4px 4px",
                      cursor: (hasEvent || hasElection) ? "pointer" : "default",
                      background: hasElection
                        ? "rgba(201,168,76,0.12)"
                        : isSelected
                        ? C.surface2
                        : C.surface,
                      border: isSelected
                        ? `1px solid ${C.gold}66`
                        : hasElection
                        ? `0.5px solid rgba(201,168,76,0.3)`
                        : `0.5px solid ${C.border}`,
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{
                      fontFamily: isToday ? "Arial Black" : "Arial",
                      fontSize: 12,
                      color: isToday ? C.gold : hasElection ? C.gold : C.text,
                      textAlign: "center",
                      marginBottom: 4,
                    }}>
                      {cell.day}
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 3,
                      flexWrap: "wrap",
                    }}>
                      {hasElection && (
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: C.gold, flexShrink: 0,
                        }} />
                      )}
                      {hasEvent && (
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: C.blue, flexShrink: 0,
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── LEGEND ── */}
          <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }} />
              <span style={{ fontFamily: "Arial", fontSize: 11, color: C.text2 }}>Election</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue }} />
              <span style={{ fontFamily: "Arial", fontSize: 11, color: C.text2 }}>Event</span>
            </div>
          </div>

          {/* ── DAY DETAIL ── */}
          {selectedDay && (selectedDay.events.length > 0 || selectedDay.elections.length > 0) && (
            <div style={{ animation: "fadeIn 0.25s ease forwards" }}>
              <div style={{
                fontFamily: "Arial Black",
                fontSize: 11,
                letterSpacing: "0.15em",
                color: C.text2,
                textTransform: "uppercase",
                marginBottom: 12,
              }}>
                {MONTH_NAMES[month]} {selectedDay.day}
              </div>

              {selectedDay.elections.map(el => (
                <div key={el.id} style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "0.5px solid rgba(201,168,76,0.3)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 10,
                }}>
                  <div style={{
                    fontFamily: "Arial Black",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: C.gold,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}>
                    Election Day
                  </div>
                  <div style={{
                    fontFamily: "Arial Black",
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}>
                    {el.name}
                  </div>
                  {el.state && (
                    <div style={{ fontFamily: "Arial", fontSize: 12, color: C.gold }}>
                      {el.state}
                    </div>
                  )}
                </div>
              ))}

              {selectedDay.events.map(ev => {
                const typeColor = TYPE_COLORS[ev.event_type] || C.text2;
                const typeLabel = TYPE_LABELS[ev.event_type] || ev.event_type;
                return (
                  <div key={ev.id} style={{
                    background: C.surface,
                    border: `0.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 10,
                  }}>
                    <div style={{ marginBottom: 8 }}>
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
                    </div>
                    {ev.url ? (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "Arial Black",
                          fontSize: 14,
                          color: C.text,
                          lineHeight: 1.3,
                          textDecoration: "none",
                          borderBottom: `1px solid ${C.gold}44`,
                          display: "inline",
                        }}
                      >
                        {ev.title} ↗
                      </a>
                    ) : (
                      <div style={{
                        fontFamily: "Arial Black",
                        fontSize: 14,
                        color: C.text,
                        lineHeight: 1.3,
                        marginBottom: 6,
                      }}>
                        {ev.title}
                      </div>
                    )}
                    <div style={{
                      fontFamily: "Arial", fontSize: 12,
                      color: C.text2, marginTop: 6,
                    }}>
                      {formatTime(ev.event_date)}
                      {(ev.location_name || ev.zip_code) && (
                        <> · {[ev.location_name, ev.zip_code].filter(Boolean).join(", ")}</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
