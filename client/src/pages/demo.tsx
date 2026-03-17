import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import ExtensionPopup from "@/components/extension-popup";
import FBFormMock, { type FBFormMockHandle } from "@/components/fb-form-mock";
import type { DemoVehicle } from "@/lib/demo-vehicles";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/autimik-multi-site-smart/peogianhcokkhikndoceajchphgnjohe";

const D = {
  bg: "#18191a",
  nav: "#242526",
  panel: "#242526",
  field: "#3a3b3c",
  text: "#e4e6eb",
  muted: "#b0b3b8",
  label: "#8a8d91",
  blue: "#1877f2",
  divider: "#3e4042",
  green: "#42b72a",
};

function FBNavBar({ onTogglePopup, popupOpen }: { onTogglePopup: () => void; popupOpen: boolean }) {
  return (
    <div style={{
      height: 56, background: D.nav, borderBottom: `1px solid ${D.divider}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 12px", flexShrink: 0, zIndex: 50, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill={D.blue} />
          <path d="M22 10h-2.7c-1.9 0-3.2 1.2-3.2 3.2V16H14v3.5h2.1V28h3.6v-8.5h2.6l.5-3.5h-3.1v-2.2c0-.9.5-1.4 1.5-1.4H22V10z" fill="#fff"/>
        </svg>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: D.field,
          borderRadius: 20, padding: "6px 12px",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={D.muted}><path d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1 0 4.93 4.93a7.5 7.5 0 0 0 11.72 11.72z" stroke={D.muted} strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
          <span style={{ fontSize: 13, color: D.muted }}>Search Facebook</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {["🏠", "👥", "📺", "🛒", "🎮"].map((icon, i) => (
          <div key={i} style={{
            width: 44, height: 44, borderRadius: 8, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, cursor: "default",
            background: i === 3 ? "rgba(24,119,242,0.12)" : "transparent",
            borderBottom: i === 3 ? `3px solid ${D.blue}` : "3px solid transparent",
          }}>{icon}</div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[
          <svg key="m" width="20" height="20" viewBox="0 0 24 24" fill={D.text}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
          <svg key="b" width="20" height="20" viewBox="0 0 24 24" fill={D.text}><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
        ].map((icon, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: "50%", background: D.field,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "default",
          }}>{icon}</div>
        ))}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: D.blue, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>

        <div style={{ width: 1, height: 28, background: D.divider, margin: "0 4px" }} />

        <button
          onClick={onTogglePopup}
          title="Autimik Extension"
          style={{
            width: 36, height: 36, borderRadius: "50%", border: `2px solid ${popupOpen ? D.blue : "transparent"}`,
            background: popupOpen ? "rgba(24,119,242,0.15)" : D.field,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, transition: "all 0.15s",
          }}
        >
          <img src={logoSmall} alt="Autimik" style={{ width: 22, height: 22, borderRadius: 4 }} />
        </button>
      </div>
    </div>
  );
}

function ListingPreviewCard({ vehicle }: { vehicle: Partial<DemoVehicle> & { filled: boolean } }) {
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const price = vehicle.price ? `$${Number(vehicle.price).toLocaleString()}` : null;
  const mileage = vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} mi` : null;
  const trans = vehicle.transmission ? (vehicle.transmission.toLowerCase().includes("auto") ? "Automatic transmission" : vehicle.transmission) : null;

  return (
    <div style={{
      width: 280, background: D.panel, flexShrink: 0,
      borderLeft: `1px solid ${D.divider}`, overflowY: "auto", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${D.divider}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginBottom: 2 }}>
          {title || "Title"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: D.text }}>{price || "Price"}</div>
        <div style={{ fontSize: 11, color: D.muted, marginTop: 3 }}>Listed a few seconds ago in Your Location</div>
      </div>

      {(trans || mileage || vehicle.condition) && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${D.divider}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: D.text, marginBottom: 6 }}>About this vehicle</div>
          {trans && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={D.muted}><circle cx="12" cy="12" r="10" stroke={D.muted} strokeWidth="2" fill="none"/><path d="M12 6v6l4 2" stroke={D.muted} strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 12, color: D.text }}>{trans}</span>
            </div>
          )}
          {mileage && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l3 3" stroke={D.muted} strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 12, color: D.text }}>{mileage}</span>
            </div>
          )}
        </div>
      )}

      {vehicle.description && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${D.divider}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: D.text, marginBottom: 4 }}>Seller's description</div>
          <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.5, maxHeight: 80, overflow: "hidden" }}>
            {vehicle.description}
          </div>
          <div style={{ marginTop: 8, height: 80, background: D.field, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: D.label }}>📍 Location map</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: D.muted }}>Location is approximate</div>
        </div>
      )}

      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${D.divider}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>Seller information</span>
          <span style={{ fontSize: 12, color: D.blue, cursor: "default" }}>Seller details</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: D.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Demo User</span>
        </div>
      </div>

      {!vehicle.filled && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 18, marginBottom: 8 }}>🚗</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 4 }}>Your listing preview</div>
            <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.5 }}>
              As you create your listing, you can preview how it will appear to others on Marketplace.
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "10px 14px", borderTop: `1px solid ${D.divider}`, marginTop: "auto" }}>
        <button style={{
          width: "100%", padding: "9px 0", background: D.field, border: "none",
          borderRadius: 8, fontSize: 14, fontWeight: 600, color: D.text, cursor: "default",
        }}>Message</button>
      </div>
    </div>
  );
}

export default function Demo() {
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [isFilling, setIsFilling] = useState(false);
  const [popupOpen, setPopupOpen] = useState(true);
  const [currentVehicle, setCurrentVehicle] = useState<Partial<DemoVehicle> & { filled: boolean }>({ filled: false });
  const formRef = useRef<FBFormMockHandle>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const orig = document.body.style.background;
    document.body.style.background = D.bg;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.background = orig;
      document.body.style.overflow = "";
    };
  }, []);

  const handleListVehicle = async (vehicle: DemoVehicle) => {
    if (!formRef.current || isFilling) return;
    cancelledRef.current = false;
    setIsFilling(true);
    setCurrentVehicle({ ...vehicle, filled: false });
    await formRef.current.fillWithVehicle(vehicle);
    if (!cancelledRef.current) {
      setListedIds((prev) => new Set(prev).add(vehicle.id));
      setCurrentVehicle({ ...vehicle, filled: true });
    }
    setIsFilling(false);
  };

  const handleResetAll = () => {
    cancelledRef.current = true;
    formRef.current?.reset();
    setListedIds(new Set());
    setIsFilling(false);
    setCurrentVehicle({ filled: false });
  };

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: D.bg, fontFamily: '"Segoe UI Historic","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      overflow: "hidden",
    }}>
      <style>{`
        .fb-demo-scroll::-webkit-scrollbar { width: 4px; }
        .fb-demo-scroll::-webkit-scrollbar-thumb { background: #4e4f50; border-radius: 2px; }
      `}</style>

      <FBNavBar onTogglePopup={() => setPopupOpen((o) => !o)} popupOpen={popupOpen} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{
          width: 230, flexShrink: 0, background: D.panel,
          borderRight: `1px solid ${D.divider}`, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <FBFormMock ref={formRef} onReset={handleResetAll} />
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          <div style={{
            flex: 1, background: "#1c1c1c", display: "flex", alignItems: "center",
            justifyContent: "center", position: "relative", overflow: "hidden",
          }}>
            {currentVehicle.make ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 72, marginBottom: 12 }}>🚗</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>
                  {[currentVehicle.year, currentVehicle.make, currentVehicle.model].filter(Boolean).join(" ")}
                </div>
                {currentVehicle.exteriorColor && (
                  <div style={{ fontSize: 12, color: D.muted, marginTop: 4 }}>{currentVehicle.exteriorColor}</div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 32 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", background: D.field,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", fontSize: 32,
                }}>📷</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: D.muted }}>Your vehicle photo</div>
                <div style={{ fontSize: 12, color: D.label, marginTop: 6 }}>will appear here</div>
              </div>
            )}

            <div style={{
              position: "absolute", top: 8, left: 8,
              background: "rgba(36,37,38,0.7)", borderRadius: 6,
              padding: "4px 10px", fontSize: 11, fontWeight: 700, color: D.muted,
              backdropFilter: "blur(4px)",
            }}>Preview</div>
          </div>

          <ListingPreviewCard vehicle={currentVehicle} />
        </div>

        {popupOpen && (
          <div style={{
            position: "absolute", top: 10, right: 290, zIndex: 40,
            filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6))",
          }}>
            <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <img src={logoSmall} alt="Autimik" style={{ width: 18, height: 18, borderRadius: 4 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.03em" }}>
                AUTIMIK EXTENSION
              </span>
              <button
                onClick={() => setPopupOpen(false)}
                style={{ background: "none", border: "none", color: D.muted, cursor: "pointer", fontSize: 14, padding: "0 4px", marginLeft: "auto" }}
              >×</button>
            </div>
            <ExtensionPopup
              onListVehicle={handleListVehicle}
              listedIds={listedIds}
              isFilling={isFilling}
            />
          </div>
        )}

        {!popupOpen && (
          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 40 }}>
            <button
              onClick={() => setPopupOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                background: "#22c55e", border: "none", borderRadius: 8,
                fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
              }}
            >
              <img src={logoSmall} alt="" style={{ width: 16, height: 16, borderRadius: 3 }} />
              Open Autimik
            </button>
          </div>
        )}
      </div>

      <div style={{
        height: 36, background: D.nav, borderTop: `1px solid ${D.divider}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: D.label }}>
          Demo only — not connected to real Facebook
        </span>
        <Link href="/" style={{ fontSize: 11, color: D.blue, textDecoration: "none" }}>← Back to landing</Link>
        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textDecoration: "none" }}>
          Get the real extension →
        </a>
      </div>
    </div>
  );
}
