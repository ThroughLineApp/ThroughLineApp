import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { useAuth } from "../lib/auth";
import supabase from "../lib/supabase";
import { PRIMARY, SECONDARY } from "../lib/buttons";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0A0B0D",
  surface: "#111318",
  surface2:"#181C22",
  gold:    "#C9A84C",
  text:    "#F0ECE4",
  text2:   "#9A9488",
  green:   "#4CAF7D",
  red:     "#E05C4B",
  blue:    "#5B9CF6",
  purple:  "#A78BFA",
  border:  "rgba(255,255,255,0.08)",
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Figtree:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0A0B0D; }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes copied  { 0%{background:#4CAF7D} 100%{background:#C9A84C} }
`;

// ── Dimension colors (matches rest of app) ────────────────────────────────────
const DIM_COLORS = {
  economic:"#C9A84C", healthcare:"#C94C78", climate:"#4CA87C",
  criminal:"#C97C4C", immigration:"#4C78C9", foreign:"#8E4CC9",
  education:"#C98E4C", freedom:"#4CC9C9", guns:"#C94C4C",
  housing:"#78C94C", tech:"#4C8EC9", voting:"#C94C9E",
};

// ── Party colors ──────────────────────────────────────────────────────────────
function partyColor(p) {
  if (p === "D") return C.blue;
  if (p === "R") return C.red;
  return C.purple;
}

// ── Truncate ──────────────────────────────────────────────────────────────────
function trunc(str, n) {
  if (!str) return "";
  return str.length <= n ? str : str.slice(0, n - 1) + "…";
}

// ── STEP labels for internal reference ───────────────────────────────────────
// STEP 0 = ZIP / Rep selection
// STEP 1 = Bill selection
// STEP 2 = Position + action questions
// STEP 3 = Script display

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function CallPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [step, setStep]               = useState(0);
  const [zip, setZip]                 = useState("");
  const [zipLoading, setZipLoading]   = useState(false);
  const [zipError, setZipError]       = useState(null);
  const [reps, setReps]               = useState([]);
  const [selectedRep, setSelectedRep] = useState(null);
  const [bills, setBills]             = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError]   = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [actionType, setActionType]   = useState(null);   // "call" | "email"
  const [position, setPosition]       = useState(null);   // "support" | "oppose"
  const [reason, setReason]           = useState("");
  const [userName, setUserName]       = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  const [scriptData, setScriptData]   = useState(null);   // { script, rep_phone, rep_contact_form, action_type }
  const [copied, setCopied]           = useState(false);
  const [confirmed, setConfirmed]     = useState(false);
  const [actionCount, setActionCount] = useState(null);

  // ── Pre-fill username ────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.username) setUserName(profile.username);
  }, [profile]);

  // ── Fetch social proof count ──────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("call_actions")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => { if (count > 0) setActionCount(count); });
  }, []);

  // ── If profile has zip, pre-load reps ────────────────────────────────────
  useEffect(() => {
    const profileZip = profile?.zip_code;
    if (!profileZip || reps.length > 0) return;
    fetchRepsForZip(profileZip);
  }, [profile]);

  // ── Load bills when entering step 1 ──────────────────────────────────────
  useEffect(() => {
    if (step === 1 && selectedRep) {
      fetchBills(selectedRep.bioguide_id);
    }
  }, [step, selectedRep]);

  // ── Fetch reps ────────────────────────────────────────────────────────────
  const fetchRepsForZip = async (z) => {
    setZipLoading(true);
    setZipError(null);
    try {
      const res  = await fetch(`/api/call/lookup-zip?zip=${z}`);
      const data = await res.json();
      if (!res.ok || data.error) { setZipError(data.error || "Could not find reps for that ZIP."); }
      else { setReps(data.reps || []); }
    } catch {
      setZipError("Something went wrong. Please try again.");
    } finally {
      setZipLoading(false);
    }
  };

  // ── Fetch bills ───────────────────────────────────────────────────────────
  const fetchBills = async (bioguide) => {
    setBillsLoading(true);
    setBillsError(null);
    setBills([]);
    try {
      const res  = await fetch(`/api/call/bills-for-rep?bioguide=${bioguide}`);
      const data = await res.json();
      if (!res.ok || data.error) { setBillsError(data.error || "Could not load bills."); }
      else { setBills(data.bills || []); }
    } catch {
      setBillsError("Something went wrong. Please try again.");
    } finally {
      setBillsLoading(false);
    }
  };

  // ── Generate script ───────────────────────────────────────────────────────
  const generateScript = async () => {
    if (!actionType || !position) return;
    setScriptLoading(true);
    setScriptError(null);
    try {
      const body = {
        rep_name:         selectedRep.name,
        rep_party:        selectedRep.party,
        rep_chamber:      selectedRep.chamber,
        rep_phone:        selectedRep.phone        || null,
        rep_contact_form: selectedRep.contact_form || null,
        bill_title:       selectedBill.title,
        bill_summary:     selectedBill.summary      || null,
        how_rep_voted:    selectedBill.how_voted    || null,
        user_position:    position,
        user_reason:      reason   || null,
        user_name:        userName || null,
        action_type:      actionType,
        bioguide_id:      selectedRep.bioguide_id,
        bill_id:          selectedBill.bill_id,
        user_id:          user?.id || null,
      };
      const res  = await fetch("/api/call/generate-script", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setScriptError(data.error || "Could not generate script."); }
      else {
        setScriptData(data);
        setStep(3);
      }
    } catch {
      setScriptError("Something went wrong. Please try again.");
    } finally {
      setScriptLoading(false);
    }
  };

  // ── Log confirmed action ──────────────────────────────────────────────────
  const logAction = async () => {
    if (confirmed) return;
    setConfirmed(true);
    try {
      await fetch("/api/call/log-action", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          user_id:     user?.id || null,
          bioguide_id: selectedRep?.bioguide_id || null,
          bill_id:     selectedBill?.bill_id    || null,
          action_type: actionType,
        }),
      });
      // Refresh count
      const { count } = await supabase
        .from("call_actions")
        .select("*", { count: "exact", head: true });
      if (count > 0) setActionCount(count);
    } catch { /* non-fatal */ }
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(0);
    setSelectedRep(null);
    setSelectedBill(null);
    setBills([]);
    setActionType(null);
    setPosition(null);
    setReason("");
    setScriptData(null);
    setCopied(false);
    setConfirmed(false);
    setScriptError(null);
    setBillsError(null);
  };

  // ── Shared confirmation bar ───────────────────────────────────────────────
  const ConfirmBar = ({ left, right }) => (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      justifyContent:"space-between",
      background:    C.surface2,
      border:        `1px solid ${C.border}`,
      borderRadius:  8,
      padding:       "10px 14px",
      marginBottom:  24,
      gap:           12,
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: C.gold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</div>
      {right && <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.text2, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );

  // ── Social proof banner ───────────────────────────────────────────────────
  const SocialProof = () => actionCount ? (
    <div style={{ textAlign: "center", fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.gold, marginBottom: 20, opacity: 0.8 }}>
      🔥 {actionCount.toLocaleString()} people have contacted their reps through Throughline
    </div>
  ) : null;

  // ==========================================================================
  // STEP 0 — ZIP / Rep Selection
  // ==========================================================================
  const Step0 = () => (
    <div style={{ animation: "fadeIn 0.35s ease forwards" }}>
      <SocialProof />
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 28, color: C.text, lineHeight: 1.15, marginBottom: 8 }}>
        Who do you want<br />to contact?
      </div>
      <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: C.text2, lineHeight: 1.6, marginBottom: 28 }}>
        Select one of your representatives to see what they&apos;re voting on.
      </div>

      {/* ZIP input — only shown if no reps loaded yet */}
      {reps.length === 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.text2, marginBottom: 10 }}>
            Enter your ZIP code to find your representatives.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={e => { setZip(e.target.value.replace(/\D/g, "")); setZipError(null); }}
              onKeyDown={e => e.key === "Enter" && zip.length >= 5 && !zipLoading && fetchRepsForZip(zip)}
              placeholder="Enter ZIP code"
              style={{
                flex:        1,
                background:  C.surface,
                border:      `1.5px solid ${zipError ? C.red : C.border}`,
                borderRadius:10,
                padding:     "13px 16px",
                fontFamily:  "'Figtree', sans-serif",
                fontSize:    15,
                color:       C.text,
                outline:     "none",
                transition:  "border-color 0.15s",
              }}
              onFocus={e  => e.target.style.borderColor = C.gold}
              onBlur={e   => e.target.style.borderColor = zipError ? C.red : C.border}
            />
            <button
              onClick={() => fetchRepsForZip(zip)}
              disabled={zip.length < 5 || zipLoading}
              style={{
                background:  zip.length >= 5 && !zipLoading ? C.gold : C.gold + "55",
                border:      "none",
                borderRadius:10,
                padding:     "13px 20px",
                fontFamily:  "'Barlow Condensed', sans-serif",
                fontSize:    13,
                color:       "#0A0B0D",
                cursor:      zip.length >= 5 && !zipLoading ? "pointer" : "default",
                whiteSpace:  "nowrap",
              }}
            >
              {zipLoading ? "…" : "FIND MY REPS"}
            </button>
          </div>
          {zipError && (
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.red, marginTop: 8 }}>{zipError}</div>
          )}
        </div>
      )}

      {/* Rep cards */}
      {reps.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {reps.map(rep => {
              const isSelected  = selectedRep?.bioguide_id === rep.bioguide_id;
              const isMyRep     = profile?.my_reps?.includes(rep.bioguide_id);
              const photoUrl    = rep.bioguide_id
                ? `https://bioguide.congress.gov/bioguide/photo/${rep.bioguide_id[0]}/${rep.bioguide_id}.jpg`
                : null;

              return (
                <div
                  key={rep.bioguide_id}
                  onClick={() => setSelectedRep(rep)}
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    gap:           14,
                    background:    C.surface,
                    border:        `1.5px solid ${isSelected ? C.gold : C.border}`,
                    borderRadius:  12,
                    padding:       "14px 16px",
                    cursor:        "pointer",
                    transition:    "border-color 0.15s, background 0.15s",
                    background:    isSelected ? C.surface2 : C.surface,
                  }}
                >
                  {/* Photo / initials */}
                  <div style={{
                    width:       52,
                    height:      52,
                    borderRadius:"50%",
                    background:  partyColor(rep.party) + "22",
                    border:      `1.5px solid ${partyColor(rep.party)}44`,
                    overflow:    "hidden",
                    flexShrink:  0,
                    display:     "flex",
                    alignItems:  "center",
                    justifyContent:"center",
                    fontFamily:  "'Barlow Condensed', sans-serif",
                    fontSize:    18,
                    color:       partyColor(rep.party),
                  }}>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={rep.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      rep.name?.[0] || "?"
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: C.text }}>{rep.name}</div>
                      {isMyRep && (
                        <div style={{
                          fontFamily:    "'Barlow Condensed', sans-serif",
                          fontSize:      9,
                          letterSpacing: "0.1em",
                          color:         C.gold,
                          background:    C.gold + "18",
                          border:        `1px solid ${C.gold}44`,
                          borderRadius:  20,
                          padding:       "2px 8px",
                        }}>YOUR REP</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        fontFamily:    "'Barlow Condensed', sans-serif",
                        fontSize:      10,
                        letterSpacing: "0.08em",
                        color:         partyColor(rep.party),
                        background:    partyColor(rep.party) + "18",
                        border:        `1px solid ${partyColor(rep.party)}44`,
                        borderRadius:  20,
                        padding:       "2px 8px",
                      }}>{rep.party}</div>
                      <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.text2 }}>
                        {rep.chamber} · {rep.state}
                      </div>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div style={{
                    width:       22,
                    height:      22,
                    borderRadius:"50%",
                    border:      `2px solid ${isSelected ? C.gold : C.border}`,
                    background:  isSelected ? C.gold : "transparent",
                    flexShrink:  0,
                    display:     "flex",
                    alignItems:  "center",
                    justifyContent:"center",
                    fontSize:    12,
                    color:       "#0A0B0D",
                    fontWeight:  "bold",
                    transition:  "all 0.15s",
                  }}>
                    {isSelected ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { if (selectedRep) setStep(1); }}
            disabled={!selectedRep}
            style={{
              width:         "100%",
              background:    selectedRep ? C.gold : C.gold + "44",
              color:         "#0A0B0D",
              border:        "none",
              borderRadius:  10,
              padding:       "15px 0",
              fontFamily:    "'Barlow Condensed', sans-serif",
              fontSize:      14,
              letterSpacing: "0.06em",
              cursor:        selectedRep ? "pointer" : "default",
            }}
          >
            SELECT THIS REP →
          </button>
        </>
      )}
    </div>
  );

  // ==========================================================================
  // STEP 1 — Bill Selection
  // ==========================================================================
  const Step1 = () => (
    <div style={{ animation: "fadeIn 0.35s ease forwards" }}>
      <SocialProof />
      <ConfirmBar
        left={`${selectedRep?.name}`}
        right={`${selectedRep?.party} · ${selectedRep?.chamber}`}
      />

      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, color: C.text, lineHeight: 1.2, marginBottom: 8 }}>
        What do you want<br />to talk about?
      </div>
      <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>
        These are bills {selectedRep?.name?.split(" ").pop()} has voted on recently.
      </div>

      {billsLoading && (
        <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "'Figtree', sans-serif", fontSize: 14, color: C.text2, animation: "pulse 1.5s ease infinite" }}>
          Loading recent votes…
        </div>
      )}

      {billsError && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: C.red, marginBottom: 16 }}>
            {billsError}
          </div>
          <button
            onClick={() => fetchBills(selectedRep.bioguide_id)}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: C.gold, background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 8, padding: "10px 20px", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      )}

      {!billsLoading && !billsError && bills.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {bills.map(bill => {
              const isSelected = selectedBill?.bill_id === bill.bill_id;
              const dimColor   = DIM_COLORS[bill.dimension] || C.gold;
              const voteUpper  = (bill.how_voted || "").toUpperCase();
              const voteColor  = /^YE/.test(voteUpper) ? C.green : /^NO/.test(voteUpper) ? C.red : C.text2;

              return (
                <div
                  key={bill.bill_id}
                  onClick={() => setSelectedBill(bill)}
                  style={{
                    display:      "flex",
                    gap:          0,
                    background:   isSelected ? C.surface2 : C.surface,
                    border:       `1.5px solid ${isSelected ? C.gold : C.border}`,
                    borderRadius: 10,
                    overflow:     "hidden",
                    cursor:       "pointer",
                    transition:   "border-color 0.15s",
                  }}
                >
                  {/* Dimension color stripe */}
                  <div style={{ width: 3, background: dimColor, flexShrink: 0 }} />

                  <div style={{ flex: 1, padding: "14px 14px 14px 12px" }}>
                    {/* Title */}
                    <div style={{ fontFamily: "'Figtree', sans-serif", fontWeight: "bold", fontSize: 14, color: C.text, lineHeight: 1.4, marginBottom: 8 }}>
                      {bill.title}
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {bill.vote_date && (
                        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.text2 }}>
                          {new Date(bill.vote_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                      {bill.how_voted && (
                        <div style={{
                          fontFamily:    "'Barlow Condensed', sans-serif",
                          fontSize:      9,
                          letterSpacing: "0.1em",
                          color:         voteColor,
                          background:    voteColor + "18",
                          border:        `1px solid ${voteColor}44`,
                          borderRadius:  20,
                          padding:       "2px 8px",
                        }}>
                          VOTED {voteUpper}
                        </div>
                      )}
                      <div style={{
                        fontFamily:    "'Barlow Condensed', sans-serif",
                        fontSize:      9,
                        letterSpacing: "0.08em",
                        color:         dimColor,
                        background:    dimColor + "18",
                        border:        `1px solid ${dimColor}33`,
                        borderRadius:  20,
                        padding:       "2px 8px",
                        textTransform: "uppercase",
                      }}>
                        {bill.dimension}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { if (selectedBill) setStep(2); }}
            disabled={!selectedBill}
            style={{
              width:         "100%",
              background:    selectedBill ? C.gold : C.gold + "44",
              color:         "#0A0B0D",
              border:        "none",
              borderRadius:  10,
              padding:       "15px 0",
              fontFamily:    "'Barlow Condensed', sans-serif",
              fontSize:      14,
              letterSpacing: "0.06em",
              cursor:        selectedBill ? "pointer" : "default",
              marginBottom:  16,
            }}
          >
            CHOOSE THIS BILL →
          </button>
        </>
      )}

      {!billsLoading && !billsError && bills.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "'Figtree', sans-serif", fontSize: 14, color: C.text2 }}>
          No recent votes found for this representative.
        </div>
      )}

      {/* Back link */}
      <button
        onClick={() => { setStep(0); setSelectedRep(null); setBills([]); setSelectedBill(null); }}
        style={{ background: "none", border: "none", fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.text2, cursor: "pointer", padding: 0, textDecoration: "underline" }}
      >
        ← Choose a different rep
      </button>
    </div>
  );

  // ==========================================================================
  // STEP 2 — Position + Action Questions
  // ==========================================================================
  const Step2 = () => {
    const canGenerate = actionType && position;

    return (
      <div style={{ animation: "fadeIn 0.35s ease forwards" }}>
        <SocialProof />
        <ConfirmBar
          left={trunc(selectedRep?.name, 20)}
          right={trunc(selectedBill?.title, 40)}
        />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, color: C.text, lineHeight: 1.2, marginBottom: 28 }}>
          A few quick questions.
        </div>

        {/* Q1: Call or email? */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: C.text, marginBottom: 12 }}>
            How do you want to contact them?
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "call",  icon: "📞", label: "CALL",  sub: "Speak directly. Most effective." },
              { key: "email", icon: "✉️",  label: "EMAIL", sub: "Written record. Easy to send." },
            ].map(opt => {
              const sel = actionType === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setActionType(opt.key)}
                  style={{
                    flex:          1,
                    background:    sel ? C.gold + "18" : C.surface,
                    border:        `2px solid ${sel ? C.gold : C.border}`,
                    borderRadius:  12,
                    padding:       "18px 12px",
                    cursor:        "pointer",
                    textAlign:     "center",
                    transition:    "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: sel ? C.gold : C.text, marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.text2, lineHeight: 1.4 }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Q2: Support or oppose? */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: C.text, marginBottom: 12 }}>
            Do you support or oppose this bill?
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "support", icon: (<svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9,12 11,14 15,10"/></svg>), label: "SUPPORT", bg: C.gold + "18", borderColor: C.gold, labelColor: C.gold },
              { key: "oppose",  icon: (<svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.red}  strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>), label: "OPPOSE",  bg: C.red  + "18", borderColor: C.red,  labelColor: C.red  },
            ].map(opt => {
              const sel = position === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setPosition(opt.key)}
                  style={{
                    flex:          1,
                    background:    sel ? opt.bg : C.surface,
                    border:        `2px solid ${sel ? opt.borderColor : C.border}`,
                    borderRadius:  12,
                    padding:       "18px 12px",
                    cursor:        "pointer",
                    textAlign:     "center",
                    transition:    "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: sel ? opt.labelColor : C.text }}>{opt.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Q3: Reason (optional) */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: C.text, marginBottom: 12 }}>
            Anything specific you want to say? <span style={{ fontFamily: "'Figtree', sans-serif", fontWeight: "normal", color: C.text2 }}>(optional)</span>
          </div>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Add your own words (optional)"
            style={{
              width:       "100%",
              background:  C.surface2,
              border:      `1px solid ${C.border}`,
              borderRadius:8,
              padding:     "12px 14px",
              fontFamily:  "'Figtree', sans-serif",
              fontSize:    14,
              color:       C.text,
              resize:      "vertical",
              minHeight:   80,
              outline:     "none",
              lineHeight:  1.5,
            }}
            onFocus={e  => e.target.style.borderColor = C.gold}
            onBlur={e   => e.target.style.borderColor = C.border}
          />
        </div>

        {/* Q4: First name (optional) */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: C.text, marginBottom: 12 }}>
            Your first name? <span style={{ fontFamily: "'Figtree', sans-serif", fontWeight: "normal", color: C.text2 }}>(optional — personalizes the script)</span>
          </div>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="First name (optional)"
            style={{
              width:       "100%",
              background:  C.surface2,
              border:      `1px solid ${C.border}`,
              borderRadius:8,
              padding:     "12px 14px",
              fontFamily:  "'Figtree', sans-serif",
              fontSize:    14,
              color:       C.text,
              outline:     "none",
            }}
            onFocus={e  => e.target.style.borderColor = C.gold}
            onBlur={e   => e.target.style.borderColor = C.border}
          />
        </div>

        {/* Generate button */}
        {scriptError && (
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.red, marginBottom: 12 }}>{scriptError}</div>
        )}
        <button
          onClick={generateScript}
          disabled={!canGenerate || scriptLoading}
          style={{
            width:         "100%",
            background:    canGenerate && !scriptLoading ? C.gold : C.gold + "44",
            color:         "#0A0B0D",
            border:        "none",
            borderRadius:  10,
            padding:       "16px 0",
            fontFamily:    "'Barlow Condensed', sans-serif",
            fontSize:      15,
            letterSpacing: "0.06em",
            cursor:        canGenerate && !scriptLoading ? "pointer" : "default",
            marginBottom:  16,
          }}
        >
          {scriptLoading ? "Writing your script…" : "GENERATE MY SCRIPT →"}
        </button>

        {/* Back link */}
        <button
          onClick={() => { setStep(1); setSelectedBill(null); }}
          style={{ background: "none", border: "none", fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.text2, cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          ← Choose a different bill
        </button>
      </div>
    );
  };

  // ==========================================================================
  // STEP 3 — Script Display
  // ==========================================================================
  const Step3 = () => {
    if (!scriptData) return null;
    const { script, rep_phone, rep_contact_form } = scriptData;
    const isCall = actionType === "call";

    const copyScript = () => {
      navigator.clipboard?.writeText(script).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    // Format script with bold section labels
    const formattedScript = script.split("\n").map((line, i) => {
      const isLabel = /^(introduction|issue|ask|close|subject|greeting|salutation|body|closing|p\.s\.)/i.test(line.trim());
      return (
        <div key={i} style={{ marginBottom: 4 }}>
          {isLabel
            ? <strong style={{ color: C.gold, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>{line}</strong>
            : <span>{line || <br />}</span>
          }
        </div>
      );
    });

    return (
      <div style={{ animation: "fadeIn 0.35s ease forwards" }}>
        <SocialProof />
        <ConfirmBar
          left={selectedRep?.name}
          right={isCall ? "📞 CALL" : "✉️ EMAIL"}
        />

        {/* Contact info card */}
        <div style={{
          background:    C.surface,
          border:        `1.5px solid ${C.border}`,
          borderRadius:  12,
          padding:       "20px",
          marginBottom:  20,
          textAlign:     "center",
        }}>
          {isCall ? (
            rep_phone ? (
              <>
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.text2, marginBottom: 6 }}>Phone number</div>
                <a
                  href={`tel:${rep_phone}`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: C.gold, textDecoration: "none", display: "block", marginBottom: 8 }}
                >
                  {rep_phone}
                </a>
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.text2 }}>Tap to call</div>
              </>
            ) : (
              <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.text2 }}>
                Phone number not available for this representative.
              </div>
            )
          ) : (
            rep_contact_form ? (
              <>
                <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.text2, marginBottom: 12 }}>
                  Send your email via their contact form
                </div>
                <a
                  href={rep_contact_form}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:       "inline-block",
                    fontFamily:    "'Barlow Condensed', sans-serif",
                    fontSize:      13,
                    color:         "#0A0B0D",
                    background:    C.gold,
                    border:        "none",
                    borderRadius:  8,
                    padding:       "12px 24px",
                    textDecoration:"none",
                    letterSpacing: "0.06em",
                  }}
                >
                  SEND EMAIL →
                </a>
              </>
            ) : (
              <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.text2 }}>
                Contact form not available — search for {selectedRep?.name} at congress.gov.
              </div>
            )
          )}
        </div>

        {/* Script card */}
        <div style={{
          background:    C.surface,
          border:        `1px solid ${C.border}`,
          borderRadius:  12,
          padding:       "20px",
          marginBottom:  20,
        }}>
          <div style={{
            fontFamily:    "'Barlow Condensed', sans-serif",
            fontSize:      10,
            letterSpacing: "0.2em",
            color:         C.gold,
            marginBottom:  16,
            textTransform: "uppercase",
          }}>
            Your Script
          </div>
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 15, color: C.text, lineHeight: 1.7 }}>
            {formattedScript}
          </div>
        </div>

        {/* Action buttons */}
        <button
          onClick={copyScript}
          style={{
            width:         "100%",
            background:    copied ? C.green : C.surface,
            border:        `1.5px solid ${copied ? C.green : C.border}`,
            borderRadius:  10,
            padding:       "14px 0",
            fontFamily:    "'Barlow Condensed', sans-serif",
            fontSize:      13,
            color:         copied ? "#0A0B0D" : C.text,
            cursor:        "pointer",
            marginBottom:  10,
            letterSpacing: "0.06em",
            transition:    "all 0.2s",
          }}
        >
          {copied ? "COPIED ✓" : "COPY SCRIPT"}
        </button>

        <button
          onClick={logAction}
          disabled={confirmed}
          style={{
            width:         "100%",
            background:    confirmed ? C.green + "22" : C.gold,
            border:        confirmed ? `1.5px solid ${C.green}` : "none",
            borderRadius:  10,
            padding:       "14px 0",
            fontFamily:    "'Barlow Condensed', sans-serif",
            fontSize:      13,
            color:         confirmed ? C.green : "#0A0B0D",
            cursor:        confirmed ? "default" : "pointer",
            marginBottom:  confirmed ? 12 : 16,
            letterSpacing: "0.06em",
            transition:    "all 0.2s",
          }}
        >
          {confirmed ? "✓ LOGGED" : `I MADE THIS ${isCall ? "CALL" : "EMAIL"} ✓`}
        </button>

        {confirmed && (
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 13, color: C.green, textAlign: "center", marginBottom: 20 }}>
            Thank you. Your voice matters.
          </div>
        )}

        {/* Start over */}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            onClick={reset}
            style={{ background: "none", border: "none", fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.text2, cursor: "pointer", textDecoration: "underline" }}
          >
            Start over
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <>
      <Head><title>Call Your Rep — Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Figtree', sans-serif" }}>
        <Nav />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 80px" }}>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                height:       3,
                flex:         i === step ? 3 : 1,
                borderRadius: 2,
                background:   i <= step ? C.gold : C.border,
                transition:   "all 0.3s ease",
              }} />
            ))}
          </div>

          {step === 0 && <Step0 />}
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}

        </div>
      </div>
    </>
  );
}
