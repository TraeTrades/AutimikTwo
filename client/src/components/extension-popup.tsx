import { useState, useRef, useCallback } from "react";
import type { DemoVehicle } from "@/lib/demo-vehicles";
import { demoVehicles } from "@/lib/demo-vehicles";
import { processCSV } from "@/lib/parse-csv";

interface ExtensionPopupProps {
  onListVehicle: (vehicle: DemoVehicle) => void;
  listedIds: Set<string>;
  isFilling: boolean;
}

export default function ExtensionPopup({ onListVehicle, listedIds, isFilling }: ExtensionPopupProps) {
  const [vehicles, setVehicles] = useState<DemoVehicle[]>([]);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((text: string, type: string) => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const loadCSV = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      showToast("Please upload a CSV file", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = processCSV(e.target?.result as string);
      if (result.length === 0) {
        showToast("No vehicles found in CSV", "error");
        return;
      }
      setVehicles(result);
      showToast(`${result.length} vehicles loaded`, "success");
    };
    reader.readAsText(file);
  }, [showToast]);

  const loadDemo = useCallback(() => {
    setVehicles([...demoVehicles]);
    showToast("4 demo vehicles loaded", "success");
  }, [showToast]);

  const clearAll = useCallback(() => {
    setVehicles([]);
    setSearch("");
  }, []);

  const filtered = vehicles.filter((v) => {
    if (!search) return true;
    const text = [v.year, v.make, v.model, v.trim, v.vin, v.stockNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const showInventory = vehicles.length > 0;

  return (
    <div style={{
      width: "100%",
      maxWidth: 360,
      minHeight: 400,
      maxHeight: 540,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#0a0f1e",
      color: "#e2e8f0",
      display: "flex",
      flexDirection: "column",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #1e293b",
      position: "relative",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #1e293b",
        background: "#0f172a",
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#60a5fa", letterSpacing: 0.5 }}>Autimik</span>
        {showInventory && (
          <button onClick={clearAll} style={{
            background: "transparent",
            border: "1px solid #374151",
            color: "#9ca3af",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 11,
            cursor: "pointer",
          }}>Clear</button>
        )}
      </div>

      {!showInventory ? (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
        }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) loadCSV(e.dataTransfer.files[0]);
            }}
            style={{
              width: "100%",
              border: `2px dashed ${dragOver ? "#60a5fa" : "#374151"}`,
              borderRadius: 12,
              padding: "40px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
              background: dragOver ? "rgba(96,165,250,0.05)" : "transparent",
            }}
          >
            <span style={{ fontSize: 36, marginBottom: 12, display: "block" }}>📎</span>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Drop your CSV here</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>or click to browse</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) loadCSV(e.target.files[0]); }} />
          <button onClick={loadDemo} style={{
            marginTop: 16,
            background: "transparent",
            border: "none",
            color: "#60a5fa",
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
          }}>Try with demo data</button>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid #1e293b" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              style={{
                width: "100%",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "8px 12px",
                color: "#e2e8f0",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            {filtered.length === 0 && search && (
              <div style={{ textAlign: "center", padding: 20, color: "#64748b", fontSize: 13 }}>
                No vehicles match your search
              </div>
            )}
            {filtered.map((v) => {
              const isListed = listedIds.has(v.id);
              const displayTitle = [v.year, v.make, v.model].filter(Boolean).join(" ");
              const priceDisplay = v.price ? "$" + Number(v.price).toLocaleString() : "";
              const mileageDisplay = v.mileage ? Number(v.mileage).toLocaleString() + " mi" : "";

              return (
                <div key={v.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  background: "#1e293b",
                  borderRadius: 8,
                  marginBottom: 8,
                  position: "relative",
                  opacity: isListed ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}>
                  <div style={{
                    width: 56, height: 42, borderRadius: 4, background: "#334155", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, color: "#64748b",
                  }}>🚗</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}>{displayTitle}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {priceDisplay && <span style={{ marginRight: 8 }}>{priceDisplay}</span>}
                      {mileageDisplay && <span>{mileageDisplay}</span>}
                    </div>
                  </div>
                  {isListed ? (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: "#22c55e", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 6px", borderRadius: 3,
                    }}>Listed</div>
                  ) : (
                    <button
                      disabled={isFilling}
                      onClick={() => onListVehicle(v)}
                      style={{
                        background: isFilling ? "#334155" : "#3b82f6",
                        color: isFilling ? "#64748b" : "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isFilling ? "default" : "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >{isFilling ? "Filling..." : "List It"}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid #1e293b",
        fontSize: 11,
        color: "#64748b",
        textAlign: "center",
        background: "#0f172a",
      }}>
        {showInventory ? `${filtered.length} of ${vehicles.length} vehicles` : "Ready"}
      </div>

      {toastMsg && (
        <div style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 20px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 1000,
          pointerEvents: "none",
          background: toastMsg.type === "success" ? "#166534" : "#7f1d1d",
          color: toastMsg.type === "success" ? "#bbf7d0" : "#fecaca",
        }}>{toastMsg.text}</div>
      )}
    </div>
  );
}
