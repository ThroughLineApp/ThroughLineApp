import { useState } from "react";
import { useAuth } from "../lib/auth";

const C = {
  surface:  "#111318",
  surface2: "#181C22",
  gold:     "#C9A84C",
  text:     "#F0ECE4",
  text2:    "#9A9488",
  green:    "#4CAF7D",
  red:      "#E05C4B",
  border:   "rgba(255,255,255,0.08)",
};

const COPY = {
  signup:  "Where do you vote? We'll show you who represents you.",
  quiz:    "Add your ZIP to match your results to your actual representatives.",
  script:  "We need your ZIP to find your representatives.",
  feed:    "Find out who represents you. Add your ZIP.",
  profile: "Add your ZIP to see your representatives.",
};

const STYLES = `
  .zip-prompt-input:focus { border-color: #C9A84C !important; outline: none; }
`;

export default function ZipPrompt({ context = "feed", onComplete, onDismiss }) {
  const { user } = useAuth();
  const [zip, setZip]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [reps, setReps]           = useState(null); // null = not yet submitted
  const [geoLoading, setGeoLoading] = useState(false);

  const subtitle  = COPY[context] || COPY.feed;
  const showSkip  = context !== "signup" && context !== "script";

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported on this device."); return; }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const detectedZip = data?.address?.postcode?.slice(0, 5) || "";
          if (!detectedZip || detectedZip.length < 5) {
            setError("Couldn't detect your ZIP. Please enter it manually.");
            setGeoLoading(false);
            return;
          }
          setZip(detectedZip);
          setGeoLoading(false);
          setTimeout(() => handleSubmit(detectedZip), 800);
        } catch {
          setError("Location lookup failed. Please enter your ZIP manually.");
          setGeoLoading(false);
        }
      },
      () => {
        setError("Location access denied. Please enter your ZIP manually.");
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (overrideZip) => {
    const zipToUse = overrideZip || zip;
    if (zipToUse.length < 5) { setError("Enter a 5-digit ZIP code."); return; }
    setError(null);
    setLoading(true);

    try {
      const body = { zip_code: zipToUse };
      if (user?.id) body.user_id = user.id;

      const res  = await fetch("/api/call/save-zip", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Could not find representatives for that ZIP.");
        setLoading(false);
        return;
      }

      setReps(data.reps || []);
      setLoading(false);

      // Show success briefly, then call onComplete
      setTimeout(() => {
        onComplete?.({ zip: zipToUse, reps: data.reps || [] });
      }, 1200);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      background:   C.surface,
      borderRadius: 12,
      borderTop:    `2px solid ${C.gold}`,
      padding:      "20px 20px 16px",
    }}>
      <style>{STYLES}</style>

      {/* Headline */}
      <div style={{
        fontFamily:    "Arial Black",
        fontSize:      18,
        color:         C.gold,
        lineHeight:    1.2,
        marginBottom:  6,
      }}>
        Who represents you?
      </div>

      {/* Subtext */}
      <div style={{
        fontFamily:   "Arial",
        fontSize:     13,
        color:        C.text2,
        lineHeight:   1.6,
        marginBottom: 16,
      }}>
        {subtitle}
      </div>

      {/* ZIP input */}
      <input
        className="zip-prompt-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={5}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        value={zip}
        placeholder="Enter ZIP code"
        onChange={e => {
          setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
          setError(null);
        }}
        onBlur={zip.length < 5 ? (e => e.target.focus()) : undefined}
        onKeyDown={e => e.key === "Enter" && !loading && handleSubmit()}
        style={{
          width:        "100%",
          background:   C.surface2,
          border:       `1px solid ${error ? C.red : C.border}`,
          borderRadius: 12,
          padding:      "12px 16px",
          fontFamily:   "Arial",
          fontSize:     14,
          color:        C.text,
          boxSizing:    "border-box",
          marginBottom: error ? 6 : 12,
          display:      "block",
        }}
      />

      {/* Error */}
      {error && (
        <div style={{
          fontFamily:   "Arial",
          fontSize:     12,
          color:        C.red,
          marginBottom: 10,
        }}>
          {error}
        </div>
      )}

      {/* Detect location link */}
      {reps === null && !loading && (
        <button
          onClick={handleDetectLocation}
          disabled={geoLoading}
          style={{
            background:     "none",
            border:         "none",
            fontFamily:     "Arial",
            fontSize:       12,
            color:          geoLoading ? C.text2 : C.gold,
            cursor:         geoLoading ? "default" : "pointer",
            display:        "block",
            textAlign:      "center",
            width:          "100%",
            marginBottom:   10,
            padding:        "2px 0",
            textDecoration: "underline",
          }}
        >
          {geoLoading ? "Detecting location…" : "📍 Use my location automatically"}
        </button>
      )}

      {/* Success state */}
      {reps !== null ? (
        <div style={{ marginBottom: 12 }}>
          {reps.length > 0 ? (
            <>
              <div style={{
                fontFamily:   "Arial Black",
                fontSize:     11,
                color:        C.green,
                letterSpacing:"0.1em",
                marginBottom: 8,
              }}>
                ✓ FOUND YOUR REPS
              </div>
              {reps.map(rep => (
                <div key={rep.bioguide_id} style={{
                  fontFamily:   "Arial",
                  fontSize:     13,
                  color:        C.green,
                  marginBottom: 4,
                }}>
                  {rep.name} · {rep.chamber}
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2 }}>
              No representatives found for that ZIP.
            </div>
          )}
        </div>
      ) : (
        /* Submit button */
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width:         "100%",
            background:    loading ? C.gold + "88" : C.gold,
            color:         "#0A0B0D",
            border:        "none",
            borderRadius:  12,
            padding:       "13px 0",
            fontFamily:    "Arial Black",
            fontSize:      14,
            letterSpacing: "0.1em",
            cursor:        loading ? "default" : "pointer",
            marginBottom:  10,
            display:       "block",
          }}
        >
          {loading ? "LOOKING UP..." : "FIND MY REPS →"}
        </button>
      )}

      {/* Skip link — not shown for signup or script contexts */}
      {showSkip && (
        <button
          onClick={onDismiss}
          style={{
            background:     "none",
            border:         "none",
            fontFamily:     "Arial",
            fontSize:       12,
            color:          C.text2,
            cursor:         "pointer",
            display:        "block",
            width:          "100%",
            textAlign:      "center",
            textDecoration: "underline",
            padding:        "4px 0",
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  );
}
