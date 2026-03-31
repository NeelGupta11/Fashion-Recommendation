import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const FIELDS = {
  hair_color:      { label: "Hair Color",        options: ["Black","Brown","Red","Blonde","Grey"] },
  eye_color:       { label: "Eye Color",          options: ["Brown","Green","Blue","Hazel","Grey","Black","Light Brown","Light Blue"] },
  skin_tone:       { label: "Skin Tone",          options: ["Very Fair","Fair","Medium","Olive","Brown","Very Dark"] },
  under_tone:      { label: "Undertone",          options: ["Warm","Cool","Neutral"] },
  torso_length:    { label: "Torso Length",       options: ["Short Torso","Long Torso","Balanced"] },
  body_proportion: { label: "Body Proportion",    options: ["Rectangle","Inverted Triangle","Triangle","Oval","Trapezoid","Hourglass","Apple"] },
  gender:          { label: "Gender",             options: ["Men","Women"] },
  bmi_label:       { label: "BMI Category",       options: ["Underweight","Ideal","Overweight","Obese"] },
  season:          { label: "Season",             options: ["Summer","Winter","Spring","Fall","Any"] },
} as const;

type FieldKey = keyof typeof FIELDS;

const COLOR_DOT: Record<string, string> = {
  red:"#C0392B", blue:"#2980B9", green:"#27AE60", yellow:"#F1C40F",
  orange:"#E67E22", purple:"#8E44AD", brown:"#795548", black:"#1a1a1a",
  white:"#F5F5F5", grey:"#95A5A6", pink:"#E91E8C",
  "Earth Tones":"#A0785A","Olive":"#6B7B3A","Coral":"#D85A30","Peach":"#F0997B",
  "Mustard":"#BA7517","Warm Red":"#A32D2D","Jewel Tones":"#534AB7",
  "Icy Blue":"#85B7EB","Lavender":"#AFA9EC","Silver":"#B4B2A9","Emerald":"#3B6D11",
  "Teal":"#1D9E75","Soft Pinks":"#ED93B1","Plums":"#72243E",
  "Neutral Beige":"#D3D1C7","Cool Blue":"#185FA5","Icy Gray":"#B4B2A9",
};

type OutfitPair = { top: string; bottom: string };
type ImageItem = { id: string | number; name: string; image_b64: string };
type OutfitImages = { topwear: ImageItem[]; bottomwear: ImageItem[] };
type FormState = { [k in FieldKey]: string } & { height: string; weight: string };
type Result = { recommended_colors: string[]; avoid_colors: string[]; outfit_pairs: OutfitPair[] };

const STEPS = [
  { key: "appearance", label: "Appearance", icon: "✦", fields: ["hair_color","eye_color","skin_tone","under_tone"] },
  { key: "body",       label: "Body",       icon: "◈", fields: ["torso_length","body_proportion","height","weight","bmi_label"] },
  { key: "style",      label: "Style",      icon: "◉", fields: ["gender","season"] },
];

function ColorSwatch({ name, avoid = false }: { name: string; avoid?: boolean }) {
  const dot = COLOR_DOT[name] || "#888";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 14px 6px 8px",
      background: avoid ? "rgba(220,53,69,0.06)" : "rgba(255,255,255,0.06)",
      border: `1px solid ${avoid ? "rgba(220,53,69,0.2)" : "rgba(255,255,255,0.12)"}`,
      borderRadius: 40, fontSize: 12, color: avoid ? "#ff6b7a" : "#e8e0d0",
      letterSpacing: "0.02em", fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: "50%", background: dot, flexShrink: 0,
        boxShadow: `0 0 8px ${dot}88`,
        border: "1px solid rgba(255,255,255,0.15)",
      }}/>
      {name}
    </div>
  );
}

function OutfitCard({ pair, gender, season, n }: { pair: OutfitPair; gender: string; season: string; n: number }) {
  const [imgs, setImgs] = useState<OutfitImages | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (imgs) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/images`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, top_color: pair.top, bottom_color: pair.bottom, season: season === "Any" ? null : season, n }),
      });
      setImgs(await r.json()); setOpen(true);
    } catch { setImgs({ topwear:[], bottomwear:[] }); setOpen(true); }
    setLoading(false);
  };

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
      overflow: "hidden", marginBottom: 10,
      background: "rgba(255,255,255,0.03)",
      transition: "border-color 0.2s",
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,200,100,0.25)")}
    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
    >
      <button onClick={load} style={{
        width: "100%", padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 10,
        background: "transparent", border: "none", cursor: "pointer",
      }}>
        <ColorSwatch name={pair.top}/>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>+</span>
        <ColorSwatch name={pair.bottom}/>
        <span style={{
          marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)",
          fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em",
        }}>
          {loading ? "loading…" : open ? "▲ hide" : "▼ shop"}
        </span>
      </button>

      {open && imgs && (
        <div style={{ padding: "0 18px 18px" }}>
          {["topwear","bottomwear"].map(cat => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <p style={{
                fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.12em", color: "rgba(255,200,100,0.6)",
                marginBottom: 10, fontFamily: "'DM Sans', sans-serif",
              }}>{cat}</p>
              {(imgs[cat as keyof OutfitImages] || []).length === 0
                ? <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>No products found.</p>
                : <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {(imgs[cat as keyof OutfitImages] || []).map(item => (
                      <div key={item.id} style={{ width: 100 }}>
                        <div style={{
                          borderRadius: 10, overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          <img
                            src={`data:image/jpeg;base64,${item.image_b64}`}
                            alt={item.name}
                            style={{ width: 100, height: 130, objectFit: "cover", display: "block" }}
                          />
                        </div>
                        <p style={{
                          fontSize: 10, marginTop: 6, color: "rgba(255,255,255,0.5)",
                          lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif",
                        }}>{item.name.slice(0, 24)}</p>
                      </div>
                    ))}
                  </div>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    hair_color:"Black", eye_color:"Brown", skin_tone:"Medium",
    under_tone:"Warm", torso_length:"Balanced", body_proportion:"Rectangle",
    gender:"Women", bmi_label:"Ideal", season:"Summer",
    height:"165", weight:"60",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch(`${API}/recommend`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, height: parseFloat(form.height), weight: parseFloat(form.weight) }),
      });
      if (!r.ok) throw new Error(await r.text());
      setResult(await r.json());
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const selectStyle = {
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, fontSize: 13, color: "#e8e0d0",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none", cursor: "pointer",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
  };

  const inputStyle = {
    ...selectStyle,
    cursor: "text",
  };

  const labelStyle = {
    display: "block" as const, fontSize: 10,
    fontWeight: 600, textTransform: "uppercase" as const,
    letterSpacing: "0.1em", color: "rgba(255,200,100,0.7)",
    marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #0d0c0a;
          min-height: 100vh;
        }

        .fashion-app {
          min-height: 100vh;
          background: #0d0c0a;
          color: #e8e0d0;
          position: relative;
          overflow-x: hidden;
        }

        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        .orb1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(180,140,80,0.12) 0%, transparent 70%);
          top: -100px; right: -100px;
        }

        .orb2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(100,80,160,0.08) 0%, transparent 70%);
          bottom: 100px; left: -100px;
        }

        .container {
          max-width: 660px;
          margin: 0 auto;
          padding: 60px 24px 80px;
          position: relative;
          z-index: 1;
        }

        .header {
          text-align: center;
          margin-bottom: 56px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.8s ease forwards;
        }

        .eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(180,140,80,0.8);
          margin-bottom: 12px;
        }

        .title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(42px, 8vw, 64px);
          font-weight: 300;
          line-height: 1.05;
          color: #e8e0d0;
          letter-spacing: -0.01em;
        }

        .title em {
          font-style: italic;
          color: rgba(180,140,80,0.9);
        }

        .subtitle {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          margin-top: 14px;
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        .step-nav {
          display: flex;
          justify-content: center;
          gap: 0;
          margin-bottom: 40px;
          opacity: 0;
          animation: fadeUp 0.8s 0.2s ease forwards;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: transparent;
          color: rgba(255,255,255,0.3);
        }

        .step-item:first-child { border-radius: 40px 0 0 40px; }
        .step-item:last-child  { border-radius: 0 40px 40px 0; }
        .step-item:not(:first-child) { border-left: none; }

        .step-item.active {
          background: rgba(180,140,80,0.15);
          border-color: rgba(180,140,80,0.4);
          color: rgba(180,140,80,1);
        }

        .step-item.done {
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.03);
        }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeUp 0.6s 0.3s ease forwards;
        }

        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 400;
          color: #e8e0d0;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-title-icon {
          color: rgba(180,140,80,0.7);
          font-size: 14px;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field-group { position: relative; }

        .select-arrow {
          position: absolute;
          right: 12px; top: 50%; transform: translateY(-50%);
          color: rgba(180,140,80,0.5);
          pointer-events: none;
          font-size: 10px;
          margin-top: 11px;
        }

        .nav-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          opacity: 0;
          animation: fadeUp 0.6s 0.4s ease forwards;
        }

        .btn-ghost {
          padding: 10px 24px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 40px;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.04em;
        }

        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.25);
          color: rgba(255,255,255,0.7);
        }

        .btn-primary {
          padding: 12px 32px;
          background: linear-gradient(135deg, #b48c50, #8a6830);
          border: none;
          border-radius: 40px;
          color: #fff8ee;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          box-shadow: 0 4px 20px rgba(180,140,80,0.25);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(180,140,80,0.35);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .results-section {
          opacity: 0;
          animation: fadeUp 0.7s ease forwards;
        }

        .section-heading {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 300;
          color: #e8e0d0;
          margin-bottom: 18px;
          letter-spacing: -0.01em;
        }

        .section-heading span {
          font-style: italic;
          color: rgba(180,140,80,0.8);
        }

        .divider {
          width: 40px; height: 1px;
          background: rgba(180,140,80,0.3);
          margin: 32px 0;
        }

        .colors-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }

        .error-box {
          padding: 14px 18px;
          background: rgba(220,53,69,0.08);
          border: 1px solid rgba(220,53,69,0.2);
          border-radius: 12px;
          font-size: 13px;
          color: #ff6b7a;
          font-family: 'DM Sans', sans-serif;
          margin-bottom: 20px;
        }

        .loading-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }

        .loading-dots span {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: currentColor;
          animation: dot 1.2s infinite;
        }

        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        select option { background: #1a1814; color: #e8e0d0; }

        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }

        @media (max-width: 520px) {
          .fields-grid { grid-template-columns: 1fr; }
          .title { font-size: 36px; }
        }
      `}</style>

      <div className="fashion-app">
        <div className="bg-orb orb1"/>
        <div className="bg-orb orb2"/>

        <div className="container">

          {/* Header */}
          <div className="header">
            <p className="eyebrow">Personal Style Intelligence</p>
            <h1 className="title">Your <em>Perfect</em><br/>Palette</h1>
            <p className="subtitle">Colour & outfit recommendations tailored to you</p>
          </div>

          {/* Step navigation */}
          <div className="step-nav">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                className={`step-item ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                onClick={() => i < step && setStep(i)}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Form card */}
          {!result && (
            <div key={step} className="card">
              <div className="card-title">
                <span className="card-title-icon">{currentStep.icon}</span>
                {currentStep.label}
              </div>

              <div className="fields-grid">
                {currentStep.fields.map(fieldKey => {
                  const isNumeric = fieldKey === "height" || fieldKey === "weight";
                  const fieldMeta = !isNumeric ? FIELDS[fieldKey as FieldKey] : null;

                  return (
                    <div key={fieldKey} className="field-group">
                      <label style={labelStyle}>
                        {isNumeric
                          ? fieldKey === "height" ? "Height (cm)" : "Weight (kg)"
                          : fieldMeta!.label}
                      </label>
                      {isNumeric ? (
                        <input
                          type="number"
                          value={form[fieldKey as keyof FormState]}
                          onChange={e => set(fieldKey as keyof FormState, e.target.value)}
                          style={inputStyle}
                        />
                      ) : (
                        <>
                          <select
                            value={form[fieldKey as keyof FormState]}
                            onChange={e => set(fieldKey as keyof FormState, e.target.value)}
                            style={selectStyle}
                          >
                            {fieldMeta!.options.map(o => <option key={o}>{o}</option>)}
                          </select>
                          <span className="select-arrow">▾</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {!result && (
            <div className="nav-buttons">
              <button
                className="btn-ghost"
                onClick={() => step > 0 && setStep(s => s - 1)}
                style={{ visibility: step === 0 ? "hidden" : "visible" }}
              >
                ← Back
              </button>

              {!isLast ? (
                <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
                  Continue →
                </button>
              ) : (
                <button className="btn-primary" onClick={submit} disabled={loading}>
                  {loading
                    ? <span className="loading-dots"><span/><span/><span/></span>
                    : "Get Recommendations"}
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && <div className="error-box">{error}</div>}

          {/* Results */}
          {result && (
            <div className="results-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <h2 className="section-heading">Your <span>Results</span></h2>
                <button className="btn-ghost" onClick={() => { setResult(null); setStep(0); }}>
                  ← Start Over
                </button>
              </div>

              {/* Recommended colors */}
              <div style={{ marginBottom: 32 }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                  fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
                  color: "rgba(180,140,80,0.7)", marginBottom: 14,
                }}>Wear These</p>
                <div className="colors-wrap">
                  {result.recommended_colors.map(c => <ColorSwatch key={c} name={c}/>)}
                </div>
              </div>

              <div className="divider"/>

              {/* Avoid colors */}
              <div style={{ marginBottom: 32 }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                  fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
                  color: "rgba(220,53,69,0.6)", marginBottom: 14,
                }}>Avoid These</p>
                <div className="colors-wrap">
                  {result.avoid_colors.map(c => <ColorSwatch key={c} name={c} avoid/>)}
                </div>
              </div>

              <div className="divider"/>

              {/* Outfit pairs */}
              <div>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                  fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
                  color: "rgba(180,140,80,0.7)", marginBottom: 6,
                }}>Outfit Combinations</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                  color: "rgba(255,255,255,0.3)", marginBottom: 18,
                }}>Click any combination to browse real products</p>

                {result.outfit_pairs.map((pair, i) => (
                  <OutfitCard key={i} pair={pair} gender={form.gender} season={form.season} n={4}/>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}