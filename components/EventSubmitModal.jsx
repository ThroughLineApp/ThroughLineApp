import { useState } from "react";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";

const C = {
  bg:      "#0a0b0d",
  surface: "#111318",
  surface2:"#181c22",
  gold:    "#c9a84c",
  text:    "#f0ece4",
  text2:   "#9a9488",
  green:   "#4caf7d",
  red:     "#e05c4b",
  border:  "rgba(255,255,255,0.08)",
};

const EVENT_TYPES = [
  { value: "rally",      label: "Rally" },
  { value: "town_hall",  label: "Town Hall" },
  { value: "voter_reg",  label: "Voter Registration" },
  { value: "phone_bank", label: "Phone Bank" },
  { value: "canvass",    label: "Canvassing" },
  { value: "speaker",    label: "Speaker / Forum" },
];

const DIMENSIONS = [
  { key: "economic",    label: "Economic Policy" },
  { key: "healthcare",  label: "Healthcare" },
  { key: "climate",     label: "Climate & Energy" },
  { key: "criminal",    label: "Criminal Justice" },
  { key: "immigration", label: "Immigration" },
  { key: "foreign",     label: "Foreign Policy" },
  { key: "education",   label: "Education" },
  { key: "freedom",     label: "Personal Freedom" },
  { key: "guns",        label: "Gun Policy" },
  { key: "housing",     label: "Housing & Urban" },
  { key: "tech",        label: "Tech & Privacy" },
  { key: "voting",      label: "Electoral Rights" },
];

const GLOBAL_STYLES = `
  .esm-input:focus  { border-color: #c9a84c !important; outline: none; }
  .esm-select:focus { border-color: #c9a84c !important; outline: none; }
`;

const inputBase = {
  width: "100%",
  background: "#181c22",
  color: "#f0ece4",
  border: "0.5px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "10px 12px",
  fontFamily: "Arial",
  fontSize: 14,
  boxSizing: "border-box",
};

export default function EventSubmitModal({ onDismiss, onSuccess }) {
  const { user, requireAuth } = useAuth();

  const [form, setForm] = useState({
    title: "", description: "", event_type: "",
    date: "", time: "",
    location_name: "", address: "", zip_code: "",
    state: "", district: "", url: "",
  });
  const [selectedDims, setSelectedDims] = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState(null);
  const [success, setSuccess]           = useState(false);

  // Auth gate — if not logged in, fire requireAuth and close
  if (!user) {
    requireAuth("Sign in to submit an event.");
    onDismiss();
    return null;
  }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleDim = (key) =>
    setSelectedDims(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );

  const handleSubmit = async () => {
    setError(null);
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.event_type)   { setError("Event type is required."); return; }
    if (!form.date)         { setError("Date is required."); return; }

    const eventDate = form.time
      ? new Date(`${form.date}T${form.time}:00`)
      : new Date(`${form.date}T00:00:00`);
    if (isNaN(eventDate))   { setError("Invalid date or time."); return; }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("events").insert({
      title:             form.title.trim(),
      description:       form.description.trim() || null,
      event_type:        form.event_type,
      event_date:        eventDate.toISOString(),
      location_name:     form.location_name.trim() || null,
      address:           form.address.trim() || null,
      zip_code:          form.zip_code.trim() || null,
      state:             form.state.trim() || null,
      district:          form.district.trim() || null,
      url:               form.url.trim() || null,
      policy_dimensions: selectedDims,
      source:            "user",
      created_by:        user.id,
      is_visible:        true,
    });

    setSubmitting(false);

    if (insertError) {
      setError("Failed to submit event. Please try again.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onSuccess?.();
      onDismiss();
    }, 1800);
  };

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* Overlay */}
      <div
        onClick={onDismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 301,
        width: "min(560px, calc(100vw - 32px))",
        maxHeight: "85vh",
        overflowY: "auto",
        background: C.surface,
        border: "1px solid rgba(201,168,76,0.25)",
        borderRadius: 16,
        padding: "28px 24px 32px",
        scrollbarWidth: "thin",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "Arial Black",
            fontSize: 18, color: C.text,
            letterSpacing: "0.02em",
          }}>
            SUBMIT AN EVENT
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: "none", border: "none",
              color: C.text2, fontSize: 20,
              cursor: "pointer", padding: "4px 8px", lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* ── SUCCESS STATE ── */}
        {success ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{
              fontFamily: "Arial Black", fontSize: 18,
              color: C.green, marginBottom: 8,
            }}>Event Submitted!</div>
            <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2 }}>
              Your event is live and will appear in the events feed.
            </div>
          </div>
        ) : (
          <>
            <Field label="Event Title *">
              <input
                className="esm-input"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. Town Hall with Rep. Smith"
                style={inputBase}
              />
            </Field>

            <Field label="Description">
              <textarea
                className="esm-input"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="What will happen at this event?"
                rows={3}
                style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }}
              />
            </Field>

            <Field label="Event Type *">
              <select
                className="esm-select"
                value={form.event_type}
                onChange={e => set("event_type", e.target.value)}
                style={{ ...inputBase, appearance: "none", cursor: "pointer" }}
              >
                <option value="">Select a type…</option>
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Field label="Date *" noMargin>
                <input
                  className="esm-input"
                  type="date"
                  value={form.date}
                  onChange={e => set("date", e.target.value)}
                  style={{ ...inputBase, colorScheme: "dark" }}
                />
              </Field>
              <Field label="Time" noMargin>
                <input
                  className="esm-input"
                  type="time"
                  value={form.time}
                  onChange={e => set("time", e.target.value)}
                  style={{ ...inputBase, colorScheme: "dark" }}
                />
              </Field>
            </div>

            <Field label="Location Name">
              <input
                className="esm-input"
                value={form.location_name}
                onChange={e => set("location_name", e.target.value)}
                placeholder="e.g. City Hall, Room 204"
                style={inputBase}
              />
            </Field>

            <Field label="Address">
              <input
                className="esm-input"
                value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="Street address"
                style={inputBase}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Field label="ZIP Code" noMargin>
                <input
                  className="esm-input"
                  value={form.zip_code}
                  onChange={e => set("zip_code", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="e.g. 50309"
                  inputMode="numeric"
                  style={inputBase}
                />
              </Field>
              <Field label="State" noMargin>
                <input
                  className="esm-input"
                  value={form.state}
                  onChange={e => set("state", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="e.g. IA"
                  style={inputBase}
                />
              </Field>
            </div>

            <Field label="Congressional District (optional)">
              <input
                className="esm-input"
                value={form.district}
                onChange={e => set("district", e.target.value)}
                placeholder="e.g. IA-01"
                style={inputBase}
              />
            </Field>

            <Field label="External URL (optional)">
              <input
                className="esm-input"
                type="url"
                value={form.url}
                onChange={e => set("url", e.target.value)}
                placeholder="https://facebook.com/events/…"
                style={inputBase}
              />
            </Field>

            <Field label="Policy Dimensions (select all that apply)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {DIMENSIONS.map(d => {
                  const active = selectedDims.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDim(d.key)}
                      style={{
                        fontFamily: "Arial",
                        fontSize: 11,
                        padding: "5px 11px",
                        borderRadius: 20,
                        cursor: "pointer",
                        background: active ? "rgba(201,168,76,0.18)" : C.surface2,
                        color: active ? C.gold : C.text2,
                        border: `1px solid ${active ? C.gold + "66" : C.border}`,
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {error && (
              <div style={{
                fontFamily: "Arial", fontSize: 13,
                color: C.red, marginBottom: 16,
                padding: "8px 12px",
                background: C.red + "12",
                borderRadius: 8,
                border: `0.5px solid ${C.red}44`,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                fontFamily: "Arial Black",
                fontSize: 13,
                letterSpacing: "0.06em",
                padding: "13px 0",
                borderRadius: 10,
                background: submitting ? C.gold + "88" : C.gold,
                color: "#0a0b0d",
                border: "none",
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "SUBMITTING…" : "SUBMIT EVENT"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function Field({ label, children, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 16 }}>
      <div style={{
        fontFamily: "Arial Black",
        fontSize: 10,
        letterSpacing: "0.15em",
        color: "#9a9488",
        textTransform: "uppercase",
        marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
