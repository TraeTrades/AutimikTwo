import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Play } from "lucide-react";
import ExtensionPopup from "@/components/extension-popup";
import FBFormMock, { type FBFormMockHandle } from "@/components/fb-form-mock";
import type { DemoVehicle } from "@/lib/demo-vehicles";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";

export default function Demo() {
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [isFilling, setIsFilling] = useState(false);
  const formRef = useRef<FBFormMockHandle>(null);

  useEffect(() => {
    document.body.style.background = "#0a0f1e";
    return () => { document.body.style.background = ""; };
  }, []);

  const cancelledRef = useRef(false);

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
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <nav className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(10,15,30,0.92)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoSmall} alt="Autimik" className="w-8 h-8 rounded-lg" />
              <span className="text-white text-lg font-bold tracking-tight">Autimik</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <Link href="/app" className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white transition-all hover:brightness-110" style={{ background: "#22c55e" }}>
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-emerald-500/30" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
            <Play className="w-3 h-3" /> Interactive Demo
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">See how it works</h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
            Click "Try with demo data" in the extension panel, then hit "List It" on any vehicle. Watch the Facebook form fill in automatically.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-12">
          <div className="w-full lg:w-auto flex flex-col items-center">
            <div className="mb-3 text-xs font-semibold tracking-wider uppercase" style={{ color: "#60a5fa" }}>
              Chrome Extension
            </div>
            <ExtensionPopup
              onListVehicle={handleListVehicle}
              listedIds={listedIds}
              isFilling={isFilling}
            />
          </div>

          <div className="hidden lg:flex items-center self-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-px" style={{ background: "linear-gradient(90deg, transparent, #22c55e, transparent)" }} />
              <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>auto-fills</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "#22c55e" }}>
                <path d="M5 12h14m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="lg:hidden flex justify-center w-full py-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-px" style={{ background: "linear-gradient(180deg, transparent, #22c55e, transparent)" }} />
              <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>auto-fills ↓</span>
              <div className="h-8 w-px" style={{ background: "linear-gradient(180deg, transparent, #22c55e, transparent)" }} />
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col items-center">
            <div className="mb-3 text-xs font-semibold tracking-wider uppercase" style={{ color: "#1877f2" }}>
              Facebook Marketplace
            </div>
            <FBFormMock ref={formRef} onReset={handleResetAll} />
          </div>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={handleResetAll}
            className="text-sm px-6 py-2 rounded-lg border transition-colors"
            style={{ borderColor: "#374151", color: "#9ca3af", background: "transparent" }}
          >
            Reset Demo
          </button>
        </div>
      </div>
    </div>
  );
}
