import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { DemoVehicle } from "@/lib/demo-vehicles";

export interface FBFormMockHandle {
  fillWithVehicle: (vehicle: DemoVehicle) => Promise<void>;
  reset: () => void;
}

interface FBFormMockProps {
  onReset?: () => void;
}

interface FieldValues {
  vehicleType: string;
  location: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  price: string;
  bodyStyle: string;
  exteriorColor: string;
  interiorColor: string;
  cleanTitle: boolean;
  condition: string;
  fuelType: string;
  transmission: string;
  description: string;
}

const EMPTY: FieldValues = {
  vehicleType: "", location: "", year: "", make: "",
  model: "", mileage: "", price: "", bodyStyle: "",
  exteriorColor: "", interiorColor: "", cleanTitle: false,
  condition: "", fuelType: "", transmission: "", description: "",
};

const D = {
  bg: "#18191a",
  card: "#242526",
  field: "#3a3b3c",
  fieldHover: "#4e4f50",
  text: "#e4e6eb",
  label: "#8a8d91",
  border: "#3e4042",
  blue: "#1877f2",
  sidebar: "#242526",
  divider: "#3e4042",
  muted: "#b0b3b8",
  checkBg: "#ffffff",
  green: "#42b72a",
};

function deriveBodyStyle(v: DemoVehicle): string {
  const m = (v.model || "").toLowerCase();
  if (m.includes("f-150") || m.includes("silverado") || m.includes("tacoma") || m.includes("ram") || m.includes("tundra")) return "Truck";
  if (m.includes("cr-v") || m.includes("rav4") || m.includes("explorer") || m.includes("4runner") || m.includes("equinox") || m.includes("rogue") || m.includes("pilot")) return "SUV";
  if (m.includes("camry") || m.includes("civic") || m.includes("accord") || m.includes("model 3") || m.includes("altima") || m.includes("malibu")) return "Sedan";
  if (m.includes("mustang") || m.includes("challenger") || m.includes("camaro")) return "Coupe";
  return "Sedan";
}

function mapCondition(c: string): string {
  const lc = (c || "").toLowerCase();
  if (lc.includes("excellent") || lc.includes("like new")) return "Very good";
  if (lc.includes("good")) return "Good";
  if (lc.includes("fair")) return "Fair";
  return "Good";
}

function mapTransmission(t: string): string {
  const lc = (t || "").toLowerCase();
  if (lc.includes("cvt")) return "CVT transmission";
  if (lc.includes("manual")) return "Manual transmission";
  if (lc.includes("electric")) return "Automatic transmission";
  return "Automatic transmission";
}

function mapFuel(f: string): string {
  const lc = (f || "").toLowerCase();
  if (lc === "electric") return "Electric";
  if (lc.includes("hybrid")) return "Hybrid";
  if (lc.includes("diesel")) return "Diesel";
  return "Gasoline";
}

function DropdownField({ label, value, active }: { label: string; value: string; active: boolean }) {
  const filled = !!value;
  return (
    <div style={{
      background: D.field,
      borderRadius: 6,
      height: 56,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "0 12px",
      border: `2px solid ${active ? D.blue : "transparent"}`,
      boxShadow: active ? `0 0 0 1px ${D.blue}` : "none",
      transition: "border-color 0.12s",
      position: "relative",
    }}>
      <div style={{
        fontSize: filled || active ? 11 : 14,
        color: active ? D.blue : D.label,
        fontWeight: filled || active ? 600 : 400,
        marginBottom: filled ? 2 : 0,
        transition: "font-size 0.12s, color 0.12s",
        fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif',
      }}>{label}</div>
      {filled && (
        <div style={{ fontSize: 16, color: D.text, fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif', lineHeight: 1 }}>
          {value}
        </div>
      )}
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: D.label }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function InputField({ label, value, active, prefix }: { label: string; value: string; active: boolean; prefix?: string }) {
  const filled = !!value;
  return (
    <div style={{
      background: D.field,
      borderRadius: 6,
      height: 56,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: filled || active ? "6px 12px 0" : "0 12px",
      border: `2px solid ${active ? D.blue : "transparent"}`,
      boxShadow: active ? `0 0 0 1px ${D.blue}` : "none",
      transition: "border-color 0.12s",
    }}>
      <div style={{
        fontSize: filled || active ? 11 : 14,
        color: active ? D.blue : D.label,
        fontWeight: filled || active ? 600 : 400,
        marginBottom: filled ? 2 : 0,
        transition: "font-size 0.12s, color 0.12s",
        fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif',
      }}>{label}</div>
      {(filled || active) && (
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {prefix && <span style={{ fontSize: 16, color: D.text }}>{prefix}</span>}
          <span style={{ fontSize: 16, color: D.text, fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif' }}>
            {value}
            {active && <span style={{ borderRight: `2px solid ${D.blue}`, marginLeft: 1, animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function CheckboxField({ label, checked, active }: { label: string; checked: boolean; active: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      opacity: active ? 1 : 0.9,
    }}>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        background: checked ? D.blue : D.field,
        border: `2px solid ${checked ? D.blue : D.muted}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 14, color: D.text, fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif' }}>
        {label}
      </span>
    </div>
  );
}

function TextareaField({ label, value, active }: { label: string; value: string; active: boolean }) {
  const filled = !!value;
  return (
    <div style={{
      background: D.field,
      borderRadius: 6,
      minHeight: 80,
      padding: filled || active ? "8px 12px 10px" : "18px 12px",
      border: `2px solid ${active ? D.blue : "transparent"}`,
      boxShadow: active ? `0 0 0 1px ${D.blue}` : "none",
      transition: "border-color 0.12s",
    }}>
      <div style={{
        fontSize: filled || active ? 11 : 14,
        color: active ? D.blue : D.label,
        fontWeight: filled || active ? 600 : 400,
        marginBottom: filled ? 4 : 0,
        transition: "font-size 0.12s, color 0.12s",
        fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif',
      }}>{label}</div>
      {(filled || active) && (
        <div style={{
          fontSize: 15, color: D.text, whiteSpace: "pre-wrap", wordBreak: "break-word",
          lineHeight: 1.4, fontFamily: '"Segoe UI Historic", "Segoe UI", sans-serif',
        }}>
          {value}
          {active && <span style={{ borderRight: `2px solid ${D.blue}`, animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
        </div>
      )}
    </div>
  );
}

const FBFormMock = forwardRef<FBFormMockHandle, FBFormMockProps>(({ onReset }, ref) => {
  const [values, setValues] = useState<FieldValues>(EMPTY);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const cancelRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setValues(EMPTY);
    setActiveField(null);
    setConnecting(false);
    setSuccess(false);
    setTimeout(() => { cancelRef.current = false; }, 50);
  }, []);

  const typeField = useCallback((key: keyof FieldValues, value: string, instant: boolean): Promise<void> => {
    return new Promise((resolve) => {
      setActiveField(key);
      if (instant || typeof value !== "string") {
        setTimeout(() => {
          if (cancelRef.current) { resolve(); return; }
          setValues((prev) => ({ ...prev, [key]: value as any }));
          resolve();
        }, 320);
        return;
      }
      const display = value.length > 120 ? value.slice(0, 120) : value;
      let i = 0;
      const interval = setInterval(() => {
        if (cancelRef.current) { clearInterval(interval); resolve(); return; }
        i++;
        setValues((prev) => ({ ...prev, [key]: display.substring(0, i) }));
        if (i >= display.length) {
          clearInterval(interval);
          setValues((prev) => ({ ...prev, [key]: value }));
          resolve();
        }
      }, value === display ? 28 : 18);
    });
  }, []);

  const fillWithVehicle = useCallback(async (vehicle: DemoVehicle) => {
    cancelRef.current = false;
    setValues(EMPTY);
    setSuccess(false);
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 700));
    if (cancelRef.current) return;
    setConnecting(false);

    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const priceStr = vehicle.price ? Number(vehicle.price).toLocaleString() : "";
    const mileageStr = vehicle.mileage ? Number(vehicle.mileage).toLocaleString() : "";

    const steps: Array<{ key: keyof FieldValues; value: any; instant: boolean; pause?: number }> = [
      { key: "vehicleType", value: "Car/Truck", instant: true, pause: 150 },
      { key: "location", value: "Your Location", instant: true, pause: 100 },
      { key: "year", value: vehicle.year || "", instant: true, pause: 150 },
      { key: "make", value: vehicle.make || "", instant: true, pause: 200 },
      { key: "model", value: vehicle.model || "", instant: false, pause: 120 },
      { key: "mileage", value: mileageStr, instant: false, pause: 120 },
      { key: "price", value: priceStr, instant: false, pause: 120 },
      { key: "bodyStyle", value: deriveBodyStyle(vehicle), instant: true, pause: 150 },
      { key: "exteriorColor", value: vehicle.exteriorColor || "", instant: true, pause: 120 },
      { key: "interiorColor", value: "Black", instant: true, pause: 120 },
      { key: "cleanTitle", value: true, instant: true, pause: 180 },
      { key: "condition", value: mapCondition(vehicle.condition), instant: true, pause: 150 },
      { key: "fuelType", value: mapFuel(vehicle.fuelType), instant: true, pause: 120 },
      { key: "transmission", value: mapTransmission(vehicle.transmission), instant: true, pause: 120 },
      { key: "description", value: vehicle.description || "", instant: false, pause: 100 },
    ];

    for (const { key, value, instant, pause } of steps) {
      if (cancelRef.current) return;
      await typeField(key, value, instant);
      if (cancelRef.current) return;
      await new Promise((r) => setTimeout(r, pause ?? 120));
    }

    setActiveField(null);
    if (!cancelRef.current) setSuccess(true);
  }, [typeField]);

  useImperativeHandle(ref, () => ({ fillWithVehicle, reset }), [fillWithVehicle, reset]);

  const previewTitle = [values.year, values.make, values.model].filter(Boolean).join(" ") || "Vehicle listing";
  const previewPrice = values.price ? `$${values.price}` : "—";

  return (
    <div style={{
      width: "100%",
      maxWidth: 660,
      background: D.card,
      borderRadius: 10,
      border: `1px solid ${D.divider}`,
      overflow: "hidden",
      fontFamily: '"Segoe UI Historic", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      position: "relative",
    }}>
      <style>{`
        @keyframes fb-blink { 50% { border-color: transparent; } }
        @keyframes fb-spin { to { transform: rotate(360deg); } }
        @keyframes fb-slide-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .fb-mock-scroll::-webkit-scrollbar { width: 6px; }
        .fb-mock-scroll::-webkit-scrollbar-track { background: transparent; }
        .fb-mock-scroll::-webkit-scrollbar-thumb { background: #4e4f50; border-radius: 3px; }
      `}</style>

      {connecting && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(36,37,38,0.94)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 20, gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, border: `3px solid ${D.border}`, borderTopColor: D.blue,
            borderRadius: "50%", animation: "fb-spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: 13, color: D.muted }}>Connecting to Facebook Marketplace...</span>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: `1px solid ${D.divider}`, background: D.card,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill={D.blue} />
            <path d="M22 10h-2.7c-1.9 0-3.2 1.2-3.2 3.2V16H14v3.5h2.1V28h3.6v-8.5h2.6l.5-3.5h-3.1v-2.2c0-.9.5-1.4 1.5-1.4H22V10z" fill="#fff"/>
          </svg>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>Marketplace</div>
            <div style={{ fontSize: 11, color: D.label }}>Create vehicle listing</div>
          </div>
        </div>
        <button style={{
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: D.field, cursor: "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: D.text, fontWeight: 700, fontSize: 18,
        }}>×</button>
      </div>

      <div style={{ display: "flex", minHeight: 480 }}>
        <div style={{
          width: 200, flexShrink: 0, borderRight: `1px solid ${D.divider}`,
          background: D.sidebar, padding: "12px 0",
        }}>
          <div style={{ padding: "4px 12px 10px", fontSize: 13, fontWeight: 700, color: D.text }}>
            Create new listing
          </div>
          {[
            { emoji: "🏠", label: "Item for sale", active: false },
            { emoji: "🚗", label: "Vehicle for sale", active: true },
            { emoji: "🏡", label: "Home for sale or rent", active: false },
          ].map(({ emoji, label, active }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              background: active ? "rgba(24,119,242,0.15)" : "transparent",
              borderRadius: 6, margin: "0 4px",
              borderLeft: active ? `3px solid ${D.blue}` : "3px solid transparent",
              cursor: "default",
            }}>
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? D.blue : D.muted }}>
                {label}
              </span>
            </div>
          ))}

          <div style={{ margin: "12px 8px 8px", borderTop: `1px solid ${D.divider}` }} />
          <div style={{ padding: "2px 12px 8px", fontSize: 11, fontWeight: 700, color: D.label, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Steps
          </div>
          {([
            { num: 1, label: "Choose listing type", done: true },
            { num: 2, label: "Add photos & details", active: true },
            { num: 3, label: "Next steps", done: false },
          ] as { num: number; label: string; done?: boolean; active?: boolean }[]).map(({ num, label, done, active }) => (
            <div key={num} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", margin: "0 4px", borderRadius: 6,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                background: done ? D.blue : active ? "transparent" : D.field,
                border: active ? `2px solid ${D.blue}` : done ? "none" : `2px solid ${D.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                color: done ? "#fff" : active ? D.blue : D.label,
              }}>
                {done ? "✓" : num}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? D.text : D.label }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div ref={scrollRef} className="fb-mock-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

            <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 10 }}>Add photos</div>
            <div style={{
              border: `2px dashed ${D.border}`, borderRadius: 8, padding: "12px",
              display: "flex", alignItems: "center", gap: 12,
              background: D.field, marginBottom: 16, cursor: "default",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: D.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 20 }}>📷</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Add photos</div>
                <div style={{ fontSize: 11, color: D.label }}>or drag and drop</div>
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 10 }}>Add details</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DropdownField label="Vehicle type" value={values.vehicleType} active={activeField === "vehicleType"} />
              <DropdownField label="Location" value={values.location} active={activeField === "location"} />

              <div style={{ height: 1, background: D.divider, margin: "2px 0" }} />

              <DropdownField label="Year" value={values.year} active={activeField === "year"} />
              <DropdownField label="Make" value={values.make} active={activeField === "make"} />
              <InputField label="Model" value={values.model} active={activeField === "model"} />
              <InputField label="Mileage" value={values.mileage} active={activeField === "mileage"} />
              <InputField label="Price" value={values.price} active={activeField === "price"} prefix="$" />

              <div style={{ height: 1, background: D.divider, margin: "2px 0" }} />

              <DropdownField label="Body style" value={values.bodyStyle} active={activeField === "bodyStyle"} />
              <DropdownField label="Exterior color" value={values.exteriorColor} active={activeField === "exteriorColor"} />
              <DropdownField label="Interior color" value={values.interiorColor} active={activeField === "interiorColor"} />

              <CheckboxField label="This vehicle has a clean title." checked={values.cleanTitle} active={activeField === "cleanTitle"} />

              <DropdownField label="Vehicle condition" value={values.condition} active={activeField === "condition"} />
              <DropdownField label="Fuel type" value={values.fuelType} active={activeField === "fuelType"} />
              <DropdownField label="Transmission" value={values.transmission} active={activeField === "transmission"} />

              <div style={{ height: 1, background: D.divider, margin: "2px 0" }} />

              <TextareaField label="Description" value={values.description} active={activeField === "description"} />
            </div>

            {success && (
              <div style={{
                marginTop: 12, padding: "10px 14px",
                background: "rgba(66,183,42,0.12)", border: `1px solid rgba(66,183,42,0.4)`,
                borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
                animation: "fb-slide-in 0.3s ease-out",
              }}>
                <span style={{ fontSize: 16, color: D.green }}>✓</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: D.green }}>
                  Listing filled! Review and publish on Facebook.
                </span>
              </div>
            )}

            <div style={{ height: 16 }} />
          </div>

          <div style={{
            borderTop: `1px solid ${D.divider}`,
            padding: "10px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: D.card, flexShrink: 0,
          }}>
            <button
              onClick={() => { reset(); onReset?.(); }}
              style={{
                background: D.field, border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                color: D.text, cursor: "pointer",
              }}
            >
              Reset
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                background: D.field, border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                color: D.text, cursor: "default",
              }}>Back</button>
              <button style={{
                background: success ? D.blue : D.field, border: "none", borderRadius: 6,
                padding: "7px 18px", fontSize: 13, fontWeight: 600,
                color: success ? "#fff" : D.label, cursor: success ? "pointer" : "default",
                transition: "background 0.2s",
              }}>
                {success ? "Publish →" : "Next"}
              </button>
            </div>
          </div>
        </div>

        <div style={{
          width: 160, flexShrink: 0, borderLeft: `1px solid ${D.divider}`,
          background: D.bg, padding: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.label, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Preview
          </div>
          <div style={{
            background: D.card, borderRadius: 8, overflow: "hidden",
            border: `1px solid ${D.divider}`,
          }}>
            <div style={{
              height: 88, background: values.make
                ? `linear-gradient(135deg, #1c3a6e, #0f2456)`
                : D.field,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {values.make ? (
                <span style={{ fontSize: 30 }}>🚗</span>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke={D.border} strokeWidth="1.5"/>
                  <path d="M3 9l4.5 4.5L12 9l4.5 4.5L21 9" stroke={D.border} strokeWidth="1.5"/>
                </svg>
              )}
            </div>
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: D.text, lineHeight: 1.3, marginBottom: 4 }}>
                {previewTitle}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: D.text }}>
                {previewPrice}
              </div>
              {values.mileage && (
                <div style={{ fontSize: 11, color: D.label, marginTop: 2 }}>{values.mileage} mi</div>
              )}
              {values.condition && (
                <div style={{ fontSize: 11, color: D.label }}>{values.condition}</div>
              )}
              {values.exteriorColor && (
                <div style={{ fontSize: 11, color: D.label }}>{values.exteriorColor}</div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: D.label, textAlign: "center" }}>
            Listing preview
          </div>
        </div>
      </div>
    </div>
  );
});

FBFormMock.displayName = "FBFormMock";
export default FBFormMock;
