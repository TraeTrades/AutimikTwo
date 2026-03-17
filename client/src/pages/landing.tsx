import { Link } from "wouter";
import { FileSpreadsheet, Facebook, ArrowRight, Download, Upload, Zap, Menu, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import logoIcon from "@assets/autimik-icon-128_1773364287681.png";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";
import DiagonalLinesBackground from "@/components/diagonal-lines-background";

const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/autimik-multi-site-smart/peogianhcokkhikndoceajchphgnjohe";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    document.body.style.background = "#0a0f1e";
    return () => { document.body.style.background = ""; };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <div>
      <nav className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(10,15,30,0.92)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSmall} alt="Autimik" className="w-12 h-12 rounded-lg" />
            <span className="text-white text-xl font-bold tracking-tight">Autimik</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-gray-300 hover:text-white text-sm transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white text-sm transition-colors">How It Works</a>
            <Link href="/demo" className="text-gray-300 hover:text-white text-sm transition-colors">Demo</Link>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all hover:brightness-110" style={{ background: "#22c55e" }}>
              Add to Chrome — Free
            </a>
          </div>
          <button
            className="sm:hidden text-gray-300 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 px-4 py-4 flex flex-col gap-3" style={{ background: "rgba(10,15,30,0.98)" }}>
            <a href="#features" className="text-gray-300 hover:text-white text-sm py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white text-sm py-2" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <Link href="/demo" className="text-gray-300 hover:text-white text-sm py-2" onClick={() => setMobileMenuOpen(false)}>Demo</Link>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white text-center transition-all hover:brightness-110" style={{ background: "#22c55e" }}>
              Add to Chrome — Free
            </a>
          </div>
        )}
      </nav>

      <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <DiagonalLinesBackground />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <img src={logoIcon} alt="Autimik" className="w-32 h-32 mx-auto rounded-2xl mb-8 shadow-2xl shadow-emerald-500/20" />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6" style={{ background: "rgba(34,197,94,0.08)" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            100% Free — No subscription, no credit card
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Auto-list your inventory.{" "}
            <span style={{ color: "#22c55e" }}>Effortlessly.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your dealership CSV and Autimik auto-fills Facebook Marketplace vehicle listings in one click. Free Chrome extension. No signup required. Takes 30 seconds to install.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-base font-semibold px-8 py-3.5 rounded-xl text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.02]" style={{ background: "#22c55e" }}>
              Add to Chrome — It's Free <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/demo" className="w-full sm:w-auto text-base font-semibold px-8 py-3.5 rounded-xl text-white border border-white/20 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all">
              See Demo
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
            <span>✓ Free forever</span>
            <span>✓ No account needed</span>
            <span>✓ Install in 30 seconds</span>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:py-24" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything you need to list faster</h2>
            <p className="text-gray-300 text-lg max-w-xl mx-auto">Three powerful features that work together to move your inventory onto Facebook Marketplace in minutes, not hours.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-colors" style={{ background: "#111827" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(34,197,94,0.12)" }}>
                <FileSpreadsheet className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart CSV Mapping</h3>
              <p className="text-gray-300 leading-relaxed">
                Drag-and-drop your DMS or CRM export. Smart column mapping automatically detects year, make, model, price, VIN, and more from any format.
              </p>
            </div>

            <div className="rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-colors" style={{ background: "#111827" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(34,197,94,0.12)" }}>
                <RefreshCw className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Auto-Advance Mode</h3>
              <p className="text-gray-300 leading-relaxed">
                Turn on Auto mode and the extension chains through your inventory back-to-back — automatically queueing the next vehicle after each listing.
              </p>
            </div>

            <div className="rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-colors" style={{ background: "#111827" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(34,197,94,0.12)" }}>
                <Facebook className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Auto-List on Facebook</h3>
              <p className="text-gray-300 leading-relaxed">
                Our Chrome extension fills in every Marketplace field for you — price, year, make, model, mileage, photos, and description in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-20 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How it works</h2>
            <p className="text-gray-300 text-lg">Four steps from your DMS to a Facebook listing.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, icon: Download, title: "Export CSV", desc: "Pull your inventory from DealerSocket, VinSolutions, vAuto, CDK, or any DMS." },
              { step: 2, icon: Upload, title: "Install Free", desc: "Add Autimik from the Chrome Web Store in seconds — completely free, no account required." },
              { step: 3, icon: FileSpreadsheet, title: "Upload CSV", desc: "Drop your inventory file into the Autimik popup." },
              { step: 4, icon: Zap, title: "List", desc: "Click \"List It\" and watch the Facebook form fill automatically." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg border-2" style={{ borderColor: "#22c55e", color: "#22c55e" }}>
                  {step}
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Icon className="w-5 h-5" style={{ color: "#22c55e" }} />
                </div>
                <h4 className="text-white font-semibold text-lg mb-2">{title}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center rounded-2xl p-10 sm:p-14 border border-white/10" style={{ background: "#111827" }}>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to list faster?</h2>
          <p className="text-gray-300 mb-2 text-lg">A 60-car lot goes from 5 hours to 30 minutes.</p>
          <p className="text-emerald-400 font-semibold mb-8 text-lg">Free to install. Easy to use. No signup needed.</p>
          <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex text-base font-semibold px-10 py-3.5 rounded-xl text-white items-center justify-center gap-2 mx-auto transition-all hover:brightness-110 hover:scale-[1.02]" style={{ background: "#22c55e" }}>
            Add to Chrome — It's Free <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-4 text-sm text-gray-500">Works with any DMS · Facebook Marketplace · Chrome</p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 pt-8 pb-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoSmall} alt="Autimik" className="w-6 h-6 rounded" />
              <span className="text-gray-400 text-sm">Autimik</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
              <p className="text-gray-500 text-sm">
                A project and application by{" "}
                <a href="https://LECdealerapps.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors underline underline-offset-2">
                  LECdealerapps
                </a>
              </p>
              <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Privacy Policy</Link>
              <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Autimik. All rights reserved.</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-center">
            <span className="text-gray-600 text-xs font-medium uppercase tracking-widest">Developer Install</span>
            <a
              href="/autimik-extension.zip"
              download
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-white/10 text-gray-300 hover:text-white hover:border-white/25 transition-all"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Download className="w-3 h-3" />
              Download Extension ZIP
            </a>
            <span className="text-gray-500 text-xs">
              Password: <code className="text-gray-300 font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs">1234PASS</code>
            </span>
            <button
              onClick={() => setShowInstallModal(true)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
            >
              How to install manually →
            </button>
          </div>
        </div>
      </footer>

      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInstallModal(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: "#111827" }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                  <Download className="w-4 h-4" style={{ color: "#22c55e" }} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Manual Chrome Install</h2>
                  <p className="text-gray-500 text-xs">Developer mode sideload</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-gray-500 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {[
                {
                  n: 1,
                  text: "Download the ZIP file",
                  detail: (
                    <span>
                      Use the{" "}
                      <a href="/autimik-extension.zip" download className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                        Download Extension ZIP
                      </a>{" "}
                      link in the footer.
                    </span>
                  ),
                },
                {
                  n: 2,
                  text: "Unzip the file",
                  detail: (
                    <span>
                      Use any archive tool. When prompted for a password enter{" "}
                      <code className="text-gray-200 font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs">1234PASS</code>.
                    </span>
                  ),
                },
                {
                  n: 3,
                  text: "Open Chrome Extensions",
                  detail: (
                    <span>
                      In Chrome, go to{" "}
                      <code className="text-gray-200 font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs">chrome://extensions</code>{" "}
                      in the address bar.
                    </span>
                  ),
                },
                {
                  n: 4,
                  text: "Enable Developer mode",
                  detail: "Toggle the Developer mode switch in the top-right corner of the Extensions page.",
                },
                {
                  n: 5,
                  text: 'Click "Load unpacked"',
                  detail: "A new button will appear in the top-left. Click Load unpacked.",
                },
                {
                  n: 6,
                  text: "Select the unzipped folder",
                  detail: 'Navigate to and select the unzipped AutimikCPD_Dev_031726 folder (not the ZIP file itself).',
                },
                {
                  n: 7,
                  text: "Done — Autimik is installed",
                  detail: "Look for the puzzle-piece icon in your Chrome toolbar. Pin Autimik for easy access.",
                },
              ].map(({ n, text, detail }) => (
                <div key={n} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                    {n}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{text}</p>
                    <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-4">
              <p className="text-gray-600 text-xs">
                Prefer the Chrome Web Store?{" "}
                <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  Install from there instead
                </a>
              </p>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all hover:brightness-110 flex-shrink-0"
                style={{ background: "#22c55e" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
