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
  price: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  condition: string;
  description: string;
  title: string;
}

const EMPTY: FieldValues = {
  price: "", year: "", make: "", model: "",
  mileage: "", condition: "", description: "", title: "",
};

const FB_BLUE = "#1877f2";
const FB_GRAY = "#f0f2f5";
const FB_BORDER = "#dddfe2";
const FB_TEXT = "#1c1e21";
const FB_MUTED = "#65676b";

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

  const typeField = useCallback((key: keyof FieldValues, value: string, isSelect: boolean): Promise<void> => {
    return new Promise((resolve) => {
      setActiveField(key);
      if (isSelect || !value) {
        setTimeout(() => {
          if (cancelRef.current) { resolve(); return; }
          setValues((prev) => ({ ...prev, [key]: value }));
          resolve();
        }, 300);
        return;
      }
      let i = 0;
      const interval = setInterval(() => {
        if (cancelRef.current) { clearInterval(interval); resolve(); return; }
        i++;
        setValues((prev) => ({ ...prev, [key]: value.substring(0, i) }));
        if (i >= value.length) { clearInterval(interval); resolve(); }
      }, 30);
    });
  }, []);

  const fillWithVehicle = useCallback(async (vehicle: DemoVehicle) => {
    cancelRef.current = false;
    setValues(EMPTY);
    setSuccess(false);
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 800));
    if (cancelRef.current) return;
    setConnecting(false);

    const priceNum = vehicle.price ? Number(vehicle.price).toLocaleString() : "";
    const mileageNum = vehicle.mileage ? Number(vehicle.mileage).toLocaleString() : "";
    const autoTitle = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");

    const steps: { key: keyof FieldValues; value: string; isSelect: boolean }[] = [
      { key: "price", value: priceNum, isSelect: false },
      { key: "year", value: vehicle.year || "", isSelect: false },
      { key: "make", value: vehicle.make || "", isSelect: false },
      { key: "model", value: vehicle.model || "", isSelect: false },
      { key: "mileage", value: mileageNum, isSelect: false },
      { key: "condition", value: vehicle.condition || "Used - Good", isSelect: true },
      { key: "title", value: autoTitle, isSelect: false },
      { key: "description", value: vehicle.description || `${autoTitle} in great condition. Clean title, well maintained.`, isSelect: false },
    ];

    for (const { key, value, isSelect } of steps) {
      if (cancelRef.current) return;
      await typeField(key, value, isSelect);
      if (cancelRef.current) return;
      await new Promise((r) => setTimeout(r, 120));
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
      maxWidth: 620,
      background: "#fff",
      borderRadius: 8,
      border: `1px solid ${FB_BORDER}`,
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
      position: "relative",
    }}>
      {connecting && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 20, gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, border: `3px solid ${FB_GRAY}`, borderTopColor: FB_BLUE,
            borderRadius: "50%", animation: "fb-spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: 13, color: FB_MUTED }}>Connecting to Facebook Marketplace...</span>
          <style>{`@keyframes fb-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: `1px solid ${FB_BORDER}`,
        background: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill={FB_BLUE} />
            <path d="M19.5 8h-2.4c-1.7 0-2.8 1.1-2.8 2.9V13H12v3h2.3v7h3.2v-7H20l.5-3h-2.9v-1.8c0-.8.4-1.2 1.3-1.2h1.6V8z" fill="#fff"/>
          </svg>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: FB_TEXT }}>Marketplace</div>
            <div style={{ fontSize: 11, color: FB_MUTED }}>Create new listing</div>
          </div>
        </div>
        <button style={{
          width: 28, height: 28, borderRadius: "50%", border: "none",
          background: FB_GRAY, cursor: "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: FB_TEXT, fontWeight: 700,
        }}>×</button>
      </div>

      <div style={{ display: "flex", minHeight: 420 }}>
        <div style={{
          width: 200, flexShrink: 0, borderRight: `1px solid ${FB_BORDER}`,
          background: "#fff", padding: "12px 0",
        }}>
          <div style={{ padding: "4px 12px 10px", fontSize: 13, fontWeight: 700, color: FB_TEXT }}>
            Create new listing
          </div>

          {[
            { icon: "🏠", label: "Item for sale" },
            { icon: "🚗", label: "Vehicle for sale", active: true },
            { icon: "🏡", label: "Home for sale or rent" },
          ].map(({ icon, label, active }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              background: active ? "#e7f3ff" : "transparent",
              borderRadius: 6, margin: "0 4px",
              borderLeft: active ? `3px solid ${FB_BLUE}` : "3px solid transparent",
              cursor: "default",
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? FB_BLUE : FB_TEXT }}>
                {label}
              </span>
            </div>
          ))}

          <div style={{ margin: "12px 8px 6px", borderTop: `1px solid ${FB_BORDER}` }} />

          <div style={{ padding: "4px 12px 6px", fontSize: 11, fontWeight: 700, color: FB_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Steps
          </div>
          {[
            { num: 1, label: "Choose listing type", done: true },
            { num: 2, label: "Add photos & details", active: true },
            { num: 3, label: "Next steps", done: false },
          ].map(({ num, label, done, active }: { num: number; label: string; done?: boolean; active?: boolean }) => (
            <div key={num} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", margin: "0 4px",
              borderRadius: 6,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                background: done ? FB_BLUE : active ? "#fff" : FB_GRAY,
                border: active ? `2px solid ${FB_BLUE}` : done ? "none" : `2px solid ${FB_BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                color: done ? "#fff" : active ? FB_BLUE : FB_MUTED,
              }}>
                {done ? "✓" : num}
              </div>
              <span style={{
                fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? FB_TEXT : FB_MUTED,
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: FB_TEXT, marginBottom: 12 }}>
              Add photos
            </div>
            <div style={{
              border: `2px dashed ${FB_BORDER}`, borderRadius: 8, padding: "14px 12px",
              display: "flex", alignItems: "center", gap: 10,
              background: FB_GRAY, marginBottom: 14, cursor: "default",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: "#e4e6eb",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 20 }}>📷</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: FB_TEXT }}>Add photos</div>
                <div style={{ fontSize: 11, color: FB_MUTED }}>or drag and drop</div>
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: FB_TEXT, marginBottom: 10 }}>
              Add details
            </div>

            {([
              { key: "price", label: "Price", prefix: "$", placeholder: "0" },
              { key: "year", label: "Year", prefix: null, placeholder: "e.g. 2021" },
              { key: "make", label: "Make", prefix: null, placeholder: "e.g. Toyota" },
              { key: "model", label: "Model", prefix: null, placeholder: "e.g. Camry" },
              { key: "mileage", label: "Mileage", prefix: null, placeholder: "e.g. 30,000" },
            ] as { key: keyof FieldValues; label: string; prefix: string | null; placeholder: string }[]).map((field) => {
              const isActive = activeField === field.key;
              const val = values[field.key];
              const hasVal = !!val;
              return (
                <div key={field.key} style={{ position: "relative", marginBottom: 10 }}>
                  <div style={{
                    border: `1px solid ${isActive ? FB_BLUE : FB_BORDER}`,
                    borderRadius: 6,
                    background: "#fff",
                    padding: hasVal || isActive ? "18px 12px 6px" : "12px",
                    boxShadow: isActive ? `0 0 0 2px rgba(24,119,242,0.15)` : "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    minHeight: 46,
                  }}>
                    <div style={{
                      position: "absolute",
                      top: hasVal || isActive ? 5 : 14,
                      left: field.prefix && (hasVal || isActive) ? 22 : 12,
                      fontSize: hasVal || isActive ? 10 : 14,
                      fontWeight: hasVal || isActive ? 600 : 400,
                      color: isActive ? FB_BLUE : FB_MUTED,
                      transition: "all 0.15s",
                      pointerEvents: "none",
                    }}>
                      {field.label}
                    </div>
                    {(hasVal || isActive) && (
                      <div style={{ display: "flex", alignItems: "center", paddingTop: 2 }}>
                        {field.prefix && <span style={{ fontSize: 14, color: FB_TEXT, marginRight: 1 }}>{field.prefix}</span>}
                        <span style={{ fontSize: 14, color: FB_TEXT }}>
                          {val}
                          {isActive && <span style={{ borderRight: `2px solid ${FB_BLUE}`, animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ position: "relative", marginBottom: 10 }}>
              <div style={{
                border: `1px solid ${activeField === "condition" ? FB_BLUE : FB_BORDER}`,
                borderRadius: 6, background: "#fff",
                padding: values.condition || activeField === "condition" ? "18px 12px 6px" : "12px",
                boxShadow: activeField === "condition" ? `0 0 0 2px rgba(24,119,242,0.15)` : "none",
                transition: "border-color 0.15s", minHeight: 46,
              }}>
                <div style={{
                  position: "absolute", top: values.condition || activeField === "condition" ? 5 : 14,
                  left: 12, fontSize: values.condition || activeField === "condition" ? 10 : 14,
                  fontWeight: values.condition || activeField === "condition" ? 600 : 400,
                  color: activeField === "condition" ? FB_BLUE : FB_MUTED, transition: "all 0.15s",
                  pointerEvents: "none",
                }}>Condition</div>
                {(values.condition || activeField === "condition") && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, color: FB_TEXT }}>{values.condition}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill={FB_MUTED}><path d="M4 6l4 4 4-4"/></svg>
                  </div>
                )}
              </div>
            </div>

            <div style={{ position: "relative", marginBottom: 10 }}>
              <div style={{
                border: `1px solid ${activeField === "description" ? FB_BLUE : FB_BORDER}`,
                borderRadius: 6, background: "#fff",
                padding: values.description || activeField === "description" ? "18px 12px 6px" : "12px",
                boxShadow: activeField === "description" ? `0 0 0 2px rgba(24,119,242,0.15)` : "none",
                transition: "border-color 0.15s", minHeight: 72,
              }}>
                <div style={{
                  position: "absolute", top: values.description || activeField === "description" ? 5 : 14,
                  left: 12, fontSize: values.description || activeField === "description" ? 10 : 14,
                  fontWeight: values.description || activeField === "description" ? 600 : 400,
                  color: activeField === "description" ? FB_BLUE : FB_MUTED, transition: "all 0.15s",
                  pointerEvents: "none",
                }}>Description</div>
                {(values.description || activeField === "description") && (
                  <div style={{ fontSize: 13, color: FB_TEXT, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {values.description}
                    {activeField === "description" && <span style={{ borderRight: `2px solid ${FB_BLUE}`, animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
                  </div>
                )}
              </div>
              <style>{`@keyframes fb-blink { 50% { border-color: transparent; } }`}</style>
            </div>

            {success && (
              <div style={{
                padding: "10px 14px", background: "#e7f3ff", border: `1px solid #b3d7ff`,
                borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
                animation: "fb-slide-in 0.3s ease-out", marginBottom: 4,
              }}>
                <span style={{ fontSize: 16, color: FB_BLUE }}>✓</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: FB_BLUE }}>
                  Fields filled! Review your listing and click Next.
                </span>
                <style>{`@keyframes fb-slide-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              </div>
            )}
          </div>

          <div style={{
            borderTop: `1px solid ${FB_BORDER}`,
            padding: "10px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff",
          }}>
            <button
              onClick={() => { reset(); onReset?.(); }}
              style={{
                background: FB_GRAY, border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                color: FB_TEXT, cursor: "pointer",
              }}
            >
              Reset Demo
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                background: FB_GRAY, border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                color: FB_TEXT, cursor: "default",
              }}>Back</button>
              <button style={{
                background: success ? FB_BLUE : "#e4e6eb", border: "none", borderRadius: 6,
                padding: "7px 14px", fontSize: 13, fontWeight: 600,
                color: success ? "#fff" : FB_MUTED, cursor: success ? "pointer" : "default",
              }}>
                {success ? "Next →" : "Next"}
              </button>
            </div>
          </div>
        </div>

        <div style={{
          width: 170, flexShrink: 0, borderLeft: `1px solid ${FB_BORDER}`,
          background: FB_GRAY, padding: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FB_MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Preview
          </div>
          <div style={{
            background: "#fff", borderRadius: 8, overflow: "hidden",
            border: `1px solid ${FB_BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              height: 90, background: values.make ? `linear-gradient(135deg, #e8f0fe, #dbeafe)` : "#e4e6eb",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {values.make ? (
                <span style={{ fontSize: 28 }}>🚗</span>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill={FB_BORDER}>
                  <path d="M21 15l-5-5L9 17l-3-3-6 6"/>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke={FB_BORDER} strokeWidth="1.5"/>
                </svg>
              )}
            </div>
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: FB_TEXT, lineHeight: 1.3, marginBottom: 3 }}>
                {previewTitle}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: FB_TEXT }}>
                {previewPrice}
              </div>
              {values.mileage && (
                <div style={{ fontSize: 11, color: FB_MUTED, marginTop: 2 }}>
                  {values.mileage} mi
                </div>
              )}
              {values.condition && (
                <div style={{ fontSize: 11, color: FB_MUTED }}>{values.condition}</div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: FB_MUTED, textAlign: "center" }}>
            How it will appear
          </div>
        </div>
      </div>
    </div>
  );
});

FBFormMock.displayName = "FBFormMock";
export default FBFormMock;
