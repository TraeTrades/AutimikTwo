import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnAnalysis {
  header: string;
  samples: string[];
  fieldKey: string | null;
  confidence: number;
  source: "saved" | "auto" | "none";
  bucket: "auto" | "review" | "unmapped";
  required: boolean;
  fieldLabel: string | null;
  valueHint: string | null;
}

interface AnalysisResult {
  headers: string[];
  columns: ColumnAnalysis[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  hasSavedMappings: boolean;
  crmName: string;
  summary: { auto: number; review: number; unmapped: number };
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: { row: number; status: string; message: string; vehicle?: string }[];
}

const VEHICLE_FIELD_OPTIONS = [
  { key: "", label: "— Skip this column —" },
  { key: "stockNumber", label: "Stock Number ★" },
  { key: "year", label: "Year ★" },
  { key: "make", label: "Make ★" },
  { key: "model", label: "Model ★" },
  { key: "exteriorColor", label: "Color ★" },
  { key: "vin", label: "VIN" },
  { key: "price", label: "Price" },
  { key: "mileage", label: "Mileage" },
  { key: "trim", label: "Trim" },
  { key: "transmission", label: "Transmission" },
  { key: "drivetrain", label: "Drivetrain" },
  { key: "fuelType", label: "Fuel Type" },
  { key: "interiorColor", label: "Interior Color" },
  { key: "imageUrl", label: "Image URL" },
  { key: "dealershipUrl", label: "Vehicle URL" },
];

const REQUIRED_FIELDS = new Set(["stockNumber", "year", "make", "model", "exteriorColor"]);

// ─── Step indicators ──────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ["Upload", "Analyzing", "Map Columns", "Import", "Results"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <div key={num} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13,
                background: done ? "#22c55e" : active ? "#3b82f6" : "#1e293b",
                color: done || active ? "#fff" : "#64748b",
                border: active ? "2px solid #60a5fa" : "2px solid transparent",
                boxShadow: active ? "0 0 0 3px rgba(59,130,246,0.2)" : "none",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : num}
              </div>
              <span style={{ fontSize: 11, marginTop: 4, color: active ? "#93c5fd" : done ? "#4ade80" : "#475569", fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#22c55e" : "#1e293b", marginBottom: 18, transition: "background 0.4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Scanning animation ───────────────────────────────────────────────────────

function ScanAnimation({ filename }: { filename: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 24px" }}>
        {/* Outer pulse rings */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "2px solid #3b82f6",
            opacity: 0,
            animation: `ping 1.8s ease-out ${i * 0.6}s infinite`,
          }} />
        ))}
        {/* Center icon */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "linear-gradient(135deg, #1e3a5f, #1e40af)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36,
        }}>
          📊
        </div>
      </div>
      <div style={{ color: "#93c5fd", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        Analyzing columns...
      </div>
      <div style={{ color: "#64748b", fontSize: 14 }}>{filename}</div>
      <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 6 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: "#3b82f6",
            animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes bounce { 0%, 80%, 100% { transform: scaleY(0.4); opacity: 0.4; } 40% { transform: scaleY(1.2); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ─── VIN validator helper ─────────────────────────────────────────────────────

function VinBadge({ value }: { value: string }) {
  const valid = /^[A-HJ-NPR-Z0-9]{17}$/i.test(value?.trim() || "");
  if (!value) return <span style={{ color: "#475569" }}>—</span>;
  return (
    <span style={{
      padding: "1px 6px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
      background: valid ? "#14532d" : "#450a0a", color: valid ? "#4ade80" : "#f87171",
    }}>
      {value}
    </span>
  );
}

// ─── Column mapping row ───────────────────────────────────────────────────────

function ColumnRow({
  col, mappings, onMap,
}: {
  col: ColumnAnalysis;
  mappings: Record<string, string>;
  onMap: (header: string, fieldKey: string) => void;
}) {
  const mapped = mappings[col.header] || "";
  const isRequired = REQUIRED_FIELDS.has(mapped);
  const isVin = mapped === "vin";

  const bucketColor = col.bucket === "auto" ? "#22c55e" : col.bucket === "review" ? "#f59e0b" : "#64748b";
  const bucketLabel = col.bucket === "auto" ? "Auto-mapped" : col.bucket === "review" ? "Needs review" : "Unmapped";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "200px 1fr 200px", gap: 12, alignItems: "start",
      padding: "12px 16px", borderRadius: 8,
      background: isRequired ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isRequired ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
      marginBottom: 8,
    }}>
      {/* Column header */}
      <div>
        <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13, marginBottom: 4 }}>
          {col.header}
          {isRequired && <span style={{ marginLeft: 6, color: "#4ade80", fontSize: 11 }}>★ Required</span>}
        </div>
        <span style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 10,
          background: `${bucketColor}22`, color: bucketColor, fontWeight: 600,
        }}>
          {bucketLabel}
          {col.confidence > 0 && ` ${col.confidence}%`}
        </span>
        {col.source === "saved" && (
          <span style={{ marginLeft: 6, fontSize: 10, color: "#818cf8" }}>💾 Saved</span>
        )}
      </div>

      {/* Sample values */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {col.samples.slice(0, 4).map((s, i) => (
          isVin
            ? <VinBadge key={i} value={s} />
            : <span key={i} style={{
                padding: "1px 8px", borderRadius: 4, fontSize: 11,
                background: "rgba(255,255,255,0.05)", color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>{s || "—"}</span>
        ))}
        {col.valueHint && (
          <span style={{ fontSize: 10, color: "#475569", alignSelf: "center" }}>
            ({col.valueHint})
          </span>
        )}
      </div>

      {/* Field selector */}
      <select
        value={mapped}
        onChange={e => onMap(col.header, e.target.value)}
        style={{
          width: "100%", padding: "6px 10px", borderRadius: 6, fontSize: 12,
          background: "#0f172a", color: mapped ? "#e2e8f0" : "#475569",
          border: `1px solid ${isRequired ? "#22c55e66" : "#1e293b"}`,
          outline: "none", cursor: "pointer",
        }}
      >
        {VEHICLE_FIELD_OPTIONS.map(opt => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Preview table ────────────────────────────────────────────────────────────

function PreviewTable({ sampleRows, mappings }: { sampleRows: Record<string, string>[]; mappings: Record<string, string> }) {
  const mappedCols = Object.entries(mappings).filter(([, v]) => v);
  if (mappedCols.length === 0) return null;

  return (
    <div style={{ overflowX: "auto", marginTop: 24 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Preview (first 5 rows)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {mappedCols.map(([header, fieldKey]) => {
              const opt = VEHICLE_FIELD_OPTIONS.find(o => o.key === fieldKey);
              return (
                <th key={header} style={{
                  padding: "8px 12px", textAlign: "left", whiteSpace: "nowrap",
                  background: "#0f172a", color: REQUIRED_FIELDS.has(fieldKey) ? "#4ade80" : "#94a3b8",
                  borderBottom: "1px solid #1e293b", fontSize: 11, fontWeight: 600,
                }}>
                  {opt?.label?.replace(" ★", "") || fieldKey}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sampleRows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              {mappedCols.map(([header, fieldKey]) => {
                const val = row[header] || "";
                const isVin = fieldKey === "vin";
                return (
                  <td key={header} style={{ padding: "7px 12px", borderBottom: "1px solid #0f172a", color: "#94a3b8" }}>
                    {isVin ? <VinBadge value={val} /> : val || <span style={{ color: "#334155" }}>—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────

function ResultsView({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const [showLog, setShowLog] = useState(false);
  const total = result.inserted + result.updated + result.skipped + result.failed;

  const stats = [
    { label: "Inserted", value: result.inserted, color: "#22c55e", bg: "#14532d" },
    { label: "Updated", value: result.updated, color: "#3b82f6", bg: "#1e3a5f" },
    { label: "Skipped", value: result.skipped, color: "#f59e0b", bg: "#451a03" },
    { label: "Failed", value: result.failed, color: "#ef4444", bg: "#450a0a" },
  ];

  const statusColor: Record<string, string> = {
    inserted: "#22c55e", updated: "#3b82f6", skipped: "#f59e0b", failed: "#ef4444",
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>
          {result.failed === 0 ? "✅" : result.inserted + result.updated > 0 ? "⚠️" : "❌"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
          Import Complete
        </div>
        <div style={{ color: "#64748b", fontSize: 14 }}>
          Processed {total} row{total !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: "16px 12px", borderRadius: 10, textAlign: "center",
            background: s.bg, border: `1px solid ${s.color}44`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setShowLog(v => !v)}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e293b",
            background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13,
          }}
        >
          {showLog ? "Hide" : "Show"} row log ({result.rows.length})
        </button>
        <button
          onClick={onReset}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
            background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          Import Another File
        </button>
      </div>

      {showLog && (
        <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 8, border: "1px solid #1e293b" }}>
          {result.rows.map(row => (
            <div key={row.row} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
              borderBottom: "1px solid #0f172a", fontSize: 12,
            }}>
              <span style={{
                width: 40, textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums",
              }}>#{row.row}</span>
              <span style={{
                padding: "1px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                color: statusColor[row.status], background: `${statusColor[row.status]}22`,
              }}>{row.status}</span>
              {row.vehicle && <span style={{ color: "#94a3b8", flex: 1 }}>{row.vehicle}</span>}
              {!row.vehicle && <span style={{ color: "#475569", flex: 1, fontStyle: "italic" }}>{row.message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CsvImport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [crmName, setCrmName] = useState("");
  const [saveMappings, setSaveMappings] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a .csv file"); return; }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const runAnalysis = async () => {
    if (!file) return;
    setStep(2);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("crmName", crmName);

      const res = await fetch("/api/csv-import/analyze", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const data: AnalysisResult = await res.json();

      setAnalysis(data);

      // Build initial mappings from analysis
      const initial: Record<string, string> = {};
      data.columns.forEach(col => {
        if (col.fieldKey && col.confidence >= 60) initial[col.header] = col.fieldKey;
      });
      setMappings(initial);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
      setStep(1);
    }
  };

  const runImport = async () => {
    if (!file || !analysis) return;
    setImporting(true);
    setStep(4);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mappings", JSON.stringify(mappings));
      form.append("crmName", crmName);
      form.append("saveMappings", String(saveMappings));

      const res = await fetch("/api/csv-import/import", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error || "Import failed");
      const data: ImportResult = await res.json();

      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setStep(5);
    } catch (e: any) {
      setError(e.message);
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setCrmName(""); setAnalysis(null);
    setMappings({}); setImportResult(null); setError(null);
  };

  const requiredMapped = ["year", "make", "model"].every(f =>
    Object.values(mappings).includes(f)
  );

  return (
    <div style={{
      maxWidth: 860, margin: "0 auto", padding: 32,
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      color: "#e2e8f0",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>
          Import Inventory
        </h2>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
          Upload a CSV or DMS export to add vehicles to your inventory
        </p>
      </div>

      <StepBar step={step} />

      {/* Error banner */}
      {error && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, background: "#450a0a", color: "#fca5a5",
          border: "1px solid #7f1d1d", marginBottom: 20, fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#3b82f6" : file ? "#22c55e" : "#1e293b"}`,
              borderRadius: 12, padding: "48px 32px", textAlign: "center", cursor: "pointer",
              background: dragging ? "rgba(59,130,246,0.05)" : file ? "rgba(34,197,94,0.03)" : "rgba(255,255,255,0.02)",
              transition: "all 0.2s", marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div style={{ fontSize: 40, marginBottom: 12 }}>{file ? "📄" : "📁"}</div>
            {file ? (
              <>
                <div style={{ fontWeight: 600, color: "#4ade80", fontSize: 16 }}>{file.name}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB — Click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#94a3b8" }}>Drop your CSV here</div>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>or click to browse</div>
              </>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>
                CRM / Source Name
              </label>
              <input
                value={crmName}
                onChange={e => setCrmName(e.target.value)}
                placeholder="e.g. VAuto, DealerSocket, vAuto..."
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                  background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", outline: "none",
                }}
              />
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                Used to remember your column mappings
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 22 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                <input
                  type="checkbox"
                  checked={saveMappings}
                  onChange={e => setSaveMappings(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                />
                Save mappings for next time
              </label>
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={!file}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
              background: file ? "#3b82f6" : "#1e293b", color: file ? "#fff" : "#475569",
              fontSize: 14, fontWeight: 600, cursor: file ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            Analyze CSV →
          </button>
        </div>
      )}

      {/* ── Step 2: Scanning ── */}
      {step === 2 && <ScanAnimation filename={file?.name || ""} />}

      {/* ── Step 3: Mapping Review ── */}
      {step === 3 && analysis && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[
              { label: `${analysis.summary.auto} Auto-mapped`, color: "#22c55e", bg: "#14532d" },
              { label: `${analysis.summary.review} Need review`, color: "#f59e0b", bg: "#451a03" },
              { label: `${analysis.summary.unmapped} Unmapped`, color: "#64748b", bg: "#0f172a" },
              { label: `${analysis.totalRows} rows total`, color: "#3b82f6", bg: "#1e3a5f" },
            ].map(b => (
              <span key={b.label} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                color: b.color, background: b.bg, border: `1px solid ${b.color}44`,
              }}>{b.label}</span>
            ))}
            {analysis.hasSavedMappings && (
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#818cf8", background: "#1e1b4b", border: "1px solid #818cf844" }}>
                💾 Saved mappings loaded
              </span>
            )}
          </div>

          {/* Column header */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 200px", gap: 12, padding: "6px 16px", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>CSV Column</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Sample Values</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Maps To</div>
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
            {analysis.columns.map(col => (
              <ColumnRow
                key={col.header}
                col={col}
                mappings={mappings}
                onMap={(h, f) => setMappings(prev => ({ ...prev, [h]: f }))}
              />
            ))}
          </div>

          <PreviewTable sampleRows={analysis.sampleRows} mappings={mappings} />

          {!requiredMapped && (
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 8,
              background: "#451a03", border: "1px solid #92400e", color: "#fbbf24", fontSize: 13,
            }}>
              ⚠️ Map at minimum: <strong>Year</strong>, <strong>Make</strong>, and <strong>Model</strong> to continue.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={reset}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #1e293b",
                background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 13,
              }}
            >
              ← Back
            </button>
            <button
              onClick={runImport}
              disabled={!requiredMapped}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                background: requiredMapped ? "#22c55e" : "#1e293b",
                color: requiredMapped ? "#fff" : "#475569",
                fontSize: 14, fontWeight: 600, cursor: requiredMapped ? "pointer" : "not-allowed",
              }}
            >
              Import {analysis.totalRows} Vehicle{analysis.totalRows !== 1 ? "s" : ""} →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Importing ── */}
      {step === 4 && importing && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1s linear infinite" }}>⚙️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0" }}>Importing vehicles...</div>
          <div style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>
            Processing {analysis?.totalRows} rows
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Step 5: Results ── */}
      {step === 5 && importResult && (
        <ResultsView result={importResult} onReset={reset} />
      )}
    </div>
  );
}