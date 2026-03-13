import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { DemoVehicle } from "@/lib/demo-vehicles";

interface FormField {
  label: string;
  key: keyof DemoVehicle | "description";
  type: "text" | "select" | "textarea";
  placeholder: string;
  options?: string[];
}

const FIELDS: FormField[] = [
  { label: "Price", key: "price", type: "text", placeholder: "$ Price" },
  { label: "Year", key: "year", type: "text", placeholder: "Year" },
  { label: "Make", key: "make", type: "text", placeholder: "Make" },
  { label: "Model", key: "model", type: "text", placeholder: "Model" },
  { label: "Mileage", key: "mileage", type: "text", placeholder: "Mileage" },
  { label: "Condition", key: "condition", type: "select", placeholder: "Select condition", options: ["New", "Used - Like New", "Used - Excellent", "Used - Good", "Used - Fair"] },
  { label: "Description", key: "description", type: "textarea", placeholder: "Describe your vehicle..." },
];

export interface FBFormMockHandle {
  fillWithVehicle: (vehicle: DemoVehicle) => Promise<void>;
  reset: () => void;
}

interface FBFormMockProps {
  onReset?: () => void;
}

const FBFormMock = forwardRef<FBFormMockHandle, FBFormMockProps>(({ onReset }, ref) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const cancelRef = useRef(false);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setValues({});
    setActiveField(null);
    setConnecting(false);
    setSuccess(false);
    setTimeout(() => { cancelRef.current = false; }, 50);
  }, []);

  const typeField = useCallback((key: string, value: string, isSelect: boolean): Promise<void> => {
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
        if (i >= value.length) {
          clearInterval(interval);
          resolve();
        }
      }, 30);
    });
  }, []);

  const fillWithVehicle = useCallback(async (vehicle: DemoVehicle) => {
    cancelRef.current = false;
    setValues({});
    setSuccess(false);
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 800));
    if (cancelRef.current) return;
    setConnecting(false);

    const priceFormatted = vehicle.price ? "$" + Number(vehicle.price).toLocaleString() : "";

    const fieldValues: { key: string; value: string; isSelect: boolean }[] = [
      { key: "price", value: priceFormatted, isSelect: false },
      { key: "year", value: vehicle.year || "", isSelect: false },
      { key: "make", value: vehicle.make || "", isSelect: false },
      { key: "model", value: vehicle.model || "", isSelect: false },
      { key: "mileage", value: vehicle.mileage ? Number(vehicle.mileage).toLocaleString() : "", isSelect: false },
      { key: "condition", value: vehicle.condition || "Used - Good", isSelect: true },
      { key: "description", value: vehicle.description || "", isSelect: false },
    ];

    for (const { key, value, isSelect } of fieldValues) {
      if (cancelRef.current) return;
      await typeField(key, value, isSelect);
      if (cancelRef.current) return;
      await new Promise((r) => setTimeout(r, 150));
    }

    setActiveField(null);
    if (!cancelRef.current) setSuccess(true);
  }, [typeField]);

  useImperativeHandle(ref, () => ({ fillWithVehicle, reset }), [fillWithVehicle, reset]);

  return (
    <div style={{
      width: "100%",
      maxWidth: 480,
      background: "#ffffff",
      borderRadius: 12,
      border: "1px solid #e4e6eb",
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        background: "#1877f2",
        color: "#fff",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "#1877f2",
        }}>f</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Marketplace</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Vehicle for sale</div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 8px", position: "relative" }}>
        {connecting && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,0.9)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 10, gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, border: "3px solid #e4e6eb", borderTopColor: "#1877f2",
              borderRadius: "50%", animation: "fb-spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 13, color: "#65676b" }}>Connecting to Facebook Marketplace...</span>
            <style>{`@keyframes fb-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {FIELDS.map((field) => {
          const isActive = activeField === field.key;
          const val = values[field.key] || "";

          return (
            <div key={field.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#65676b", display: "block", marginBottom: 4 }}>
                {field.label}
              </label>
              {field.type === "select" ? (
                <div style={{
                  width: "100%",
                  background: "#f0f2f5",
                  border: `1px solid ${isActive ? "#22c55e" : "#dddfe2"}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontSize: 14,
                  color: val ? "#1c1e21" : "#65676b",
                  boxShadow: isActive ? "0 0 0 2px rgba(34,197,94,0.15)" : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}>
                  {val || field.placeholder}
                </div>
              ) : field.type === "textarea" ? (
                <div style={{
                  width: "100%",
                  minHeight: 72,
                  background: "#f0f2f5",
                  border: `1px solid ${isActive ? "#22c55e" : "#dddfe2"}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontSize: 14,
                  color: val ? "#1c1e21" : "#65676b",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow: isActive ? "0 0 0 2px rgba(34,197,94,0.15)" : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}>
                  {val || field.placeholder}
                  {isActive && <span style={{ borderRight: "2px solid #22c55e", animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
                  <style>{`@keyframes fb-blink { 50% { border-color: transparent; } }`}</style>
                </div>
              ) : (
                <div style={{
                  width: "100%",
                  background: "#f0f2f5",
                  border: `1px solid ${isActive ? "#22c55e" : "#dddfe2"}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontSize: 14,
                  color: val ? "#1c1e21" : "#65676b",
                  boxShadow: isActive ? "0 0 0 2px rgba(34,197,94,0.15)" : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}>
                  {val || field.placeholder}
                  {isActive && <span style={{ borderRight: "2px solid #22c55e", animation: "fb-blink 1s step-end infinite" }}>&#8203;</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {success && (
        <div style={{
          margin: "0 16px 16px",
          padding: "12px 16px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          animation: "fb-slide-in 0.3s ease-out",
        }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>
            Listing ready! Review and publish on Facebook.
          </span>
          <style>{`@keyframes fb-slide-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}

      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid #e4e6eb",
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
      }}>
        <button onClick={() => { reset(); onReset?.(); }} style={{
          background: "#e4e6eb",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          color: "#1c1e21",
          cursor: "pointer",
        }}>Reset Demo</button>
        <button style={{
          background: success ? "#22c55e" : "#e4e6eb",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          color: success ? "#fff" : "#65676b",
          cursor: success ? "pointer" : "default",
        }}>
          {success ? "Publish" : "Next"}
        </button>
      </div>
    </div>
  );
});

FBFormMock.displayName = "FBFormMock";
export default FBFormMock;
