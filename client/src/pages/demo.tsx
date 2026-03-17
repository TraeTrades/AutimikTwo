import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import ExtensionPopup from "@/components/extension-popup";
import FBFormMock, { type FBFormMockHandle, type FieldValues } from "@/components/fb-form-mock";
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

const EMPTY_VALUES: FieldValues = {
  vehicleType: "", location: "", year: "", make: "", model: "",
  mileage: "", price: "", bodyStyle: "", exteriorColor: "", interiorColor: "",
  cleanTitle: false, condition: "", fuelType: "", transmission: "", description: "",
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke={D.muted} strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke={D.muted} strokeWidth="2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 13, color: D.muted }}>Search Facebook</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 2 }}>
        {[
          { label: "Home", icon: <path d="M3 12l9-9 9 9M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
          { label: "Friends", icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/> },
          { label: "Watch", icon: <><rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><polyline points="17 2 12 7 7 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></> },
          { label: "Marketplace", icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></> },
          { label: "Gaming", icon: <><rect x="2" y="6" width="20" height="12" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/><line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></> },
        ].map(({ label, icon }, i) => {
          const active = i === 3;
          return (
            <div key={label} style={{
              width: 96, height: 48, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2, cursor: "default",
              color: active ? D.blue : D.muted,
              borderBottom: active ? `3px solid ${D.blue}` : "3px solid transparent",
              borderRadius: active ? 0 : 8,
              fontSize: 10, fontWeight: 600, transition: "color 0.1s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24">{icon}</svg>
              <span style={{ display: active ? "block" : "none" }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, background: D.field,
          borderRadius: 20, padding: "6px 14px", cursor: "default",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={D.text}><line x1="12" y1="5" x2="12" y2="19" stroke={D.text} strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke={D.text} strokeWidth="2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Create</span>
        </div>

        {[
          <svg key="msg" width="20" height="20" viewBox="0 0 24 24" fill={D.text}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={D.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
          <svg key="bell" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke={D.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        ].map((icon, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: "50%", background: D.field,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "default",
          }}>{icon}</div>
        ))}

        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1da1f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </div>

        <div style={{ width: 1, height: 28, background: D.divider }} />

        <button
          onClick={onTogglePopup}
          title="Autimik Extension"
          style={{
            width: 36, height: 36, borderRadius: "50%",
            border: `2px solid ${popupOpen ? D.blue : "transparent"}`,
            background: popupOpen ? "rgba(24,119,242,0.18)" : D.field,
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

function ListingPreviewCard({ values }: { values: FieldValues }) {
  const title = [values.year, values.make, values.model].filter(Boolean).join(" ");
  const price = values.price ? `$${values.price}` : null;
  const mileage = values.mileage ? `${values.mileage} mi` : null;
  const trans = values.transmission || null;
  const location = values.location || "Your location";
  const anyFilled = !!(values.year || values.make || values.price);

  return (
    <div style={{
      width: 300, background: D.panel, flexShrink: 0,
      borderLeft: `1px solid ${D.divider}`, display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${D.divider}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: anyFilled ? D.text : D.label, marginBottom: 2, minHeight: 20 }}>
          {title || "Title"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: anyFilled ? D.text : D.label, minHeight: 28 }}>
          {price || "Price"}
        </div>
        <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>
          Listed a few seconds ago in {location}
        </div>
      </div>

      {(trans || mileage || values.condition || values.bodyStyle) && (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${D.divider}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginBottom: 8 }}>About this vehicle</div>
          {trans && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={D.muted} strokeWidth="2"/><path d="M12 6v6l4 2" stroke={D.muted} strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 13, color: D.text }}>{trans}</span>
            </div>
          )}
          {mileage && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={D.muted} strokeWidth="2"/><path d="M12 7v5l3 3" stroke={D.muted} strokeWidth="2" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 13, color: D.text }}>{mileage}</span>
            </div>
          )}
          {values.condition && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke={D.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize: 13, color: D.text }}>{values.condition}</span>
            </div>
          )}
          {values.bodyStyle && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="1" y="9" width="22" height="9" rx="2" stroke={D.muted} strokeWidth="2"/><path d="M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" stroke={D.muted} strokeWidth="2"/><circle cx="7" cy="18" r="2" fill={D.muted}/><circle cx="17" cy="18" r="2" fill={D.muted}/></svg>
              <span style={{ fontSize: 13, color: D.text }}>{values.bodyStyle}</span>
            </div>
          )}
        </div>
      )}

      {values.description && (
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${D.divider}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginBottom: 6 }}>Seller's description</div>
          <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.55, maxHeight: 88, overflow: "hidden" }}>
            {values.description}
          </div>
          <div style={{
            marginTop: 10, height: 90, borderRadius: 8, overflow: "hidden",
            background: "linear-gradient(135deg, #2d4a6b 0%, #1a3a52 40%, #2d4a6b 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.05) 1px, transparent 1px), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="#fff" strokeWidth="2"/></svg>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: D.label }}>{location} · Location is approximate</div>
        </div>
      )}

      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${D.divider}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Seller information</span>
          <span style={{ fontSize: 12, color: D.blue, cursor: "default" }}>Seller details</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1da1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Demo User</div>
            <div style={{ fontSize: 11, color: D.muted }}>Marketplace seller</div>
          </div>
        </div>
      </div>

      {!anyFilled && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚗</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 6 }}>Your listing preview</div>
            <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.6 }}>
              As you create your listing, you can preview how it will appear to others on Marketplace.
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "12px 16px", marginTop: "auto", borderTop: `1px solid ${D.divider}` }}>
        <button style={{
          width: "100%", padding: "10px 0", background: D.field, border: "none",
          borderRadius: 8, fontSize: 14, fontWeight: 600, color: D.muted, cursor: "default",
        }}>Message</button>
      </div>
    </div>
  );
}

export default function Demo() {
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [isFilling, setIsFilling] = useState(false);
  const [popupOpen, setPopupOpen] = useState(true);
  const [liveValues, setLiveValues] = useState<FieldValues>(EMPTY_VALUES);
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

  const handleValuesChange = useCallback((vals: FieldValues) => {
    setLiveValues(vals);
  }, []);

  const handleListVehicle = async (vehicle: DemoVehicle) => {
    if (!formRef.current || isFilling) return;
    cancelledRef.current = false;
    setIsFilling(true);
    await formRef.current.fillWithVehicle(vehicle);
    if (!cancelledRef.current) {
      setListedIds((prev) => new Set(prev).add(vehicle.id));
    }
    setIsFilling(false);
  };

  const handleResetAll = () => {
    cancelledRef.current = true;
    formRef.current?.reset();
    setListedIds(new Set());
    setIsFilling(false);
    setLiveValues(EMPTY_VALUES);
  };

  const anyFilled = !!(liveValues.year || liveValues.make || liveValues.price);

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: D.bg, fontFamily: '"Segoe UI Historic","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      overflow: "hidden",
    }}>
      <FBNavBar onTogglePopup={() => setPopupOpen((o) => !o)} popupOpen={popupOpen} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{
          width: 240, flexShrink: 0, background: D.panel,
          borderRight: `1px solid ${D.divider}`, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <FBFormMock ref={formRef} onReset={handleResetAll} onValuesChange={handleValuesChange} />
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          <div style={{
            flex: 1, background: "#1c1c1c", display: "flex", alignItems: "center",
            justifyContent: "center", position: "relative", overflow: "hidden",
          }}>
            {anyFilled ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 80, marginBottom: 14, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}>🚗</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: D.text }}>
                  {[liveValues.year, liveValues.make, liveValues.model].filter(Boolean).join(" ")}
                </div>
                {liveValues.exteriorColor && (
                  <div style={{ fontSize: 12, color: D.muted, marginTop: 4 }}>{liveValues.exteriorColor}</div>
                )}
                {liveValues.price && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: D.blue, marginTop: 8 }}>${liveValues.price}</div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 32 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", background: D.field,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", fontSize: 36,
                }}>📷</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: D.muted }}>Vehicle photos</div>
                <div style={{ fontSize: 12, color: D.label, marginTop: 6 }}>will appear here</div>
              </div>
            )}

            <div style={{
              position: "absolute", top: 10, left: 12,
              fontSize: 12, fontWeight: 700, color: D.muted,
              letterSpacing: "0.02em",
            }}>Preview</div>
          </div>

          <ListingPreviewCard values={liveValues} />
        </div>

        {popupOpen && (
          <div style={{
            position: "absolute", top: 8, right: 308, zIndex: 40,
            filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.7))",
          }}>
            <div style={{
              marginBottom: 4, display: "flex", alignItems: "center", gap: 6,
              padding: "0 2px",
            }}>
              <img src={logoSmall} alt="Autimik" style={{ width: 16, height: 16, borderRadius: 3 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.06em" }}>
                AUTIMIK EXTENSION
              </span>
              <button
                onClick={() => setPopupOpen(false)}
                style={{
                  background: "none", border: "none", color: D.muted,
                  cursor: "pointer", fontSize: 16, padding: "0 2px", marginLeft: "auto", lineHeight: 1,
                }}
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
          <div style={{ position: "absolute", top: 8, right: 10, zIndex: 40 }}>
            <button
              onClick={() => setPopupOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                background: "#22c55e", border: "none", borderRadius: 8,
                fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
                boxShadow: "0 2px 12px rgba(34,197,94,0.4)",
              }}
            >
              <img src={logoSmall} alt="" style={{ width: 16, height: 16, borderRadius: 3 }} />
              Open Autimik
            </button>
          </div>
        )}
      </div>

      <div style={{
        height: 34, background: D.nav, borderTop: `1px solid ${D.divider}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: D.label }}>Demo — not connected to real Facebook</span>
        <Link href="/" style={{ fontSize: 11, color: D.blue, textDecoration: "none" }}>← Back to landing</Link>
        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textDecoration: "none" }}>
          Get the real extension →
        </a>
      </div>
    </div>
  );
}
