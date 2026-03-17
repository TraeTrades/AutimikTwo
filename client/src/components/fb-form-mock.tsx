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
  text: "#e4e6eb",
  label: "#8a8d91",
  blue: "#1877f2",
  divider: "#3e4042",
  muted: "#b0b3b8",
  green: "#42b72a",
};

function deriveBodyStyle(v: DemoVehicle): string {
  const m = (v.model || "").toLowerCase();
  if (m.includes("f-150") || m.includes("silverado") || m.includes("tacoma") || m.includes("tundra")) return "Truck";
  if (m.includes("cr-v") || m.includes("rav4") || m.includes("explorer") || m.includes("4runner") || m.includes("pilot")) return "SUV";
  if (m.includes("camry") || m.includes("civic") || m.includes("accord") || m.includes("model 3") || m.includes("altima")) return "Sedan";
  if (m.includes("mustang") || m.includes("challenger") || m.includes("camaro")) return "Coupe";
  return "Sedan";
}

function mapCondition(c: string) {
  const lc = (c || "").toLowerCase();
  if (lc.includes("excellent") || lc.includes("like new")) return "Very good";
  if (lc.includes("good")) return "Good";
  if (lc.includes("fair")) return "Fair";
  return "Good";
}

function mapTransmission(t: string) {
  const lc = (t || "").toLowerCase();
  if (lc.includes("cvt")) return "CVT transmission";
  if (lc.includes("manual")) return "Manual transmission";
  return "Automatic transmission";
}

function mapFuel(f: string) {
  const lc = (f || "").toLowerCase();
  if (lc === "electric") return "Electric";
  if (lc.includes("hybrid")) return "Hybrid";
  if (lc.includes("diesel")) return "Diesel";
  return "Gasoline";
}

function FBField({ label, value, active, isDropdown, isTextarea, isCheckbox, prefix }: {
  label: string; value?: string | boolean; active: boolean;
  isDropdown?: boolean; isTextarea?: boolean; isCheckbox?: boolean; prefix?: string;
}) {
  if (isCheckbox) {
    const checked = value === true;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px" }}>
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0, transition: "background 0.15s",
          background: checked ? D.blue : D.field,
          border: `2px solid ${checked ? D.blue : D.muted}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span style={{ fontSize: 13, color: D.text }}>{label}</span>
      </div>
    );
  }

  const strVal = String(value || "");
  const filled = !!strVal;

  return (
    <div style={{
      background: D.field, borderRadius: 6,
      minHeight: isTextarea ? 72 : 48,
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: filled || active ? (isTextarea ? "7px 12px 8px" : "5px 12px 5px") : "0 12px",
      border: `2px solid ${active ? D.blue : "transparent"}`,
      transition: "border-color 0.12s", position: "relative",
    }}>
      <div style={{
        fontSize: filled || active ? 10 : 13,
        color: active ? D.blue : D.label,
        fontWeight: filled || active ? 600 : 400,
        marginBottom: (filled || active) && !isTextarea ? 1 : 0,
        transition: "font-size 0.12s, color 0.12s",
      }}>{label}</div>
      {(filled || active) && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          {prefix && <span style={{ fontSize: 14, color: D.text, lineHeight: 1.4 }}>{prefix}</span>}
          <span style={{
            fontSize: 14, color: D.text, lineHeight: 1.4,
            whiteSpace: isTextarea ? "pre-wrap" : "nowrap",
            overflow: isTextarea ? "visible" : "hidden",
            textOverflow: isTextarea ? "clip" : "ellipsis",
            wordBreak: isTextarea ? "break-word" : "normal",
          }}>
            {strVal}
            {active && <span style={{ borderRight: `2px solid ${D.blue}`, animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
          </span>
        </div>
      )}
      {isDropdown && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: D.muted }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

  const reset = useCallback(() => {
    cancelRef.current = true;
    setValues(EMPTY);
    setActiveField(null);
    setConnecting(false);
    setSuccess(false);
    setTimeout(() => { cancelRef.current = false; }, 50);
  }, []);

  const typeField = useCallback((key: keyof FieldValues, value: any, instant: boolean): Promise<void> => {
    return new Promise((resolve) => {
      setActiveField(key);
      if (instant || typeof value !== "string") {
        setTimeout(() => {
          if (cancelRef.current) { resolve(); return; }
          setValues((p) => ({ ...p, [key]: value }));
          resolve();
        }, 300);
        return;
      }
      const display = value.length > 100 ? value.slice(0, 100) : value;
      let i = 0;
      const iv = setInterval(() => {
        if (cancelRef.current) { clearInterval(iv); resolve(); return; }
        i++;
        setValues((p) => ({ ...p, [key]: display.substring(0, i) }));
        if (i >= display.length) {
          clearInterval(iv);
          setValues((p) => ({ ...p, [key]: value }));
          resolve();
        }
      }, 25);
    });
  }, []);

  const fillWithVehicle = useCallback(async (vehicle: DemoVehicle) => {
    cancelRef.current = false;
    setValues(EMPTY);
    setSuccess(false);
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 600));
    if (cancelRef.current) return;
    setConnecting(false);

    const steps: Array<{ key: keyof FieldValues; value: any; instant: boolean }> = [
      { key: "vehicleType", value: "Car/Truck", instant: true },
      { key: "location", value: "Your Location", instant: true },
      { key: "year", value: vehicle.year || "", instant: true },
      { key: "make", value: vehicle.make || "", instant: true },
      { key: "model", value: vehicle.model || "", instant: false },
      { key: "mileage", value: vehicle.mileage ? Number(vehicle.mileage).toLocaleString() : "", instant: false },
      { key: "price", value: vehicle.price ? Number(vehicle.price).toLocaleString() : "", instant: false },
      { key: "bodyStyle", value: deriveBodyStyle(vehicle), instant: true },
      { key: "exteriorColor", value: vehicle.exteriorColor || "", instant: true },
      { key: "interiorColor", value: "Black", instant: true },
      { key: "cleanTitle", value: true, instant: true },
      { key: "condition", value: mapCondition(vehicle.condition), instant: true },
      { key: "fuelType", value: mapFuel(vehicle.fuelType), instant: true },
      { key: "transmission", value: mapTransmission(vehicle.transmission), instant: true },
      { key: "description", value: vehicle.description || "", instant: false },
    ];

    for (const { key, value, instant } of steps) {
      if (cancelRef.current) return;
      await typeField(key, value, instant);
      if (cancelRef.current) return;
      await new Promise((r) => setTimeout(r, 100));
    }

    setActiveField(null);
    if (!cancelRef.current) setSuccess(true);
  }, [typeField]);

  useImperativeHandle(ref, () => ({ fillWithVehicle, reset }), [fillWithVehicle, reset]);

  const a = activeField;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <style>{`
        @keyframes fb-blink { 50% { border-color: transparent; } }
        @keyframes fb-spin { to { transform: rotate(360deg); } }
        @keyframes fb-fadein { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .fb-form-scroll { overflow-y: auto; flex: 1; }
        .fb-form-scroll::-webkit-scrollbar { width: 4px; }
        .fb-form-scroll::-webkit-scrollbar-track { background: transparent; }
        .fb-form-scroll::-webkit-scrollbar-thumb { background: #4e4f50; border-radius: 2px; }
      `}</style>

      {connecting && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(36,37,38,0.95)", zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <div style={{ width: 28, height: 28, border: `3px solid #3a3b3c`, borderTopColor: D.blue, borderRadius: "50%", animation: "fb-spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 12, color: D.muted }}>Connecting...</span>
        </div>
      )}

      <div style={{ padding: "12px 12px 4px" }}>
        <div style={{ fontSize: 11, color: D.muted, marginBottom: 1 }}>Marketplace</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: D.text }}>Vehicle for sale</div>
          <button style={{ fontSize: 11, fontWeight: 600, color: D.text, background: D.field, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "default" }}>
            Save draft
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${D.divider}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: D.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: D.text }}>Demo User</div>
          <div style={{ fontSize: 11, color: D.muted }}>Listing to Marketplace · Public</div>
        </div>
      </div>

      <div className="fb-form-scroll" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <FBField label="Vehicle type" value={values.vehicleType} active={a === "vehicleType"} isDropdown />

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: D.text, marginBottom: 4, marginTop: 2 }}>Photos · 0/20 &nbsp; Videos · 0/1</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["📷 Add photos", "🎥 Add video"].map((t) => (
              <div key={t} style={{
                flex: 1, height: 70, background: D.field, borderRadius: 6, border: `1px dashed ${D.divider}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: D.label, gap: 3, cursor: "default",
              }}>
                <span style={{ fontSize: 18 }}>{t.split(" ")[0]}</span>
                <span>{t.split(" ").slice(1).join(" ")}</span>
                {t.includes("video") && <span style={{ fontSize: 9, color: D.muted }}>(1 min max)</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: D.muted, padding: "4px 0 2px", borderTop: `1px solid ${D.divider}`, marginTop: 2 }}>
          <span style={{ fontWeight: 700, color: D.text, fontSize: 12 }}>About this vehicle</span>
          <div style={{ marginTop: 2 }}>Help buyers know more about the vehicle you're listing.</div>
        </div>

        <div style={{ background: D.field, borderRadius: 6, height: 44, display: "flex", alignItems: "center", padding: "0 10px", gap: 8, border: `2px solid ${a === "location" ? D.blue : "transparent"}` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={D.muted}><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/></svg>
          <span style={{ fontSize: 13, color: values.location ? D.text : D.label }}>
            {values.location || "Location"}
          </span>
        </div>

        <FBField label="Year" value={values.year} active={a === "year"} isDropdown />
        <FBField label="Make" value={values.make} active={a === "make"} />
        <FBField label="Model" value={values.model} active={a === "model"} />

        <div style={{ borderTop: `1px solid ${D.divider}`, paddingTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: D.text, marginBottom: 2 }}>Price</div>
          <div style={{ fontSize: 11, color: D.muted, marginBottom: 6 }}>Enter your price for this vehicle.</div>
          <FBField label="Price" value={values.price} active={a === "price"} prefix="$" />
        </div>

        <FBField label="Mileage" value={values.mileage} active={a === "mileage"} />
        <FBField label="Body style" value={values.bodyStyle} active={a === "bodyStyle"} isDropdown />
        <FBField label="Exterior color" value={values.exteriorColor} active={a === "exteriorColor"} isDropdown />
        <FBField label="Interior color" value={values.interiorColor} active={a === "interiorColor"} isDropdown />
        <FBField label="Vehicle condition" value={values.condition} active={a === "condition"} isDropdown />
        <FBField label="Fuel type" value={values.fuelType} active={a === "fuelType"} isDropdown />
        <FBField label="Transmission" value={values.transmission} active={a === "transmission"} isDropdown />
        <FBField label="This vehicle has a clean title" value={values.cleanTitle} active={a === "cleanTitle"} isCheckbox />

        <div style={{ borderTop: `1px solid ${D.divider}`, paddingTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: D.text, marginBottom: 2 }}>Description</div>
          <div style={{ fontSize: 11, color: D.muted, marginBottom: 6 }}>Tell buyers anything that you haven't had the chance to include yet about your vehicle.</div>
          <FBField label="Description" value={values.description} active={a === "description"} isTextarea />
        </div>

        {success && (
          <div style={{
            padding: "8px 12px", borderRadius: 8, background: "rgba(66,183,42,0.1)", border: `1px solid rgba(66,183,42,0.35)`,
            display: "flex", alignItems: "center", gap: 8, animation: "fb-fadein 0.3s ease-out",
          }}>
            <span style={{ color: D.green, fontSize: 15 }}>✓</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: D.green }}>Listing filled! Ready to publish.</span>
          </div>
        )}

        <div style={{ fontSize: 10, color: D.label, lineHeight: 1.4, paddingTop: 4, paddingBottom: 4 }}>
          Marketplace items are public and can be seen by anyone on or off Facebook. Items like animals, drugs, weapons, and others are prohibited.
        </div>
      </div>

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${D.divider}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { reset(); onReset?.(); }} style={{
            flex: 1, padding: "9px 0", background: D.field, border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 600, color: D.text, cursor: "pointer",
          }}>Reset</button>
          <button style={{
            flex: 1, padding: "9px 0", background: success ? D.blue : D.field, border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 600, color: success ? "#fff" : D.muted,
            cursor: success ? "pointer" : "default", transition: "background 0.2s",
          }}>
            {success ? "Publish →" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
});

FBFormMock.displayName = "FBFormMock";
export default FBFormMock;
