import { Link } from "wouter";
import { Globe, FileSpreadsheet, Facebook, ArrowRight, Download, Search, Upload, Zap, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import logoIcon from "@assets/autimik-icon-128_1773364287681.png";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.background = "#0a0f1e";
    return () => { document.body.style.background = ""; };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <nav className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(10,15,30,0.92)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSmall} alt="Autimik" className="w-9 h-9 rounded-lg" />
            <span className="text-white text-xl font-bold tracking-tight">Autimik</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-gray-300 hover:text-white text-sm transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white text-sm transition-colors">How It Works</a>
            <Link href="/app" className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all hover:brightness-110" style={{ background: "#22c55e" }}>
              Launch App
            </Link>
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
            <Link href="/app" className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white text-center transition-all hover:brightness-110" style={{ background: "#22c55e" }}>
              Launch App
            </Link>
          </div>
        )}
      </nav>

      <section className="px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <img src={logoIcon} alt="Autimik" className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-2xl mb-8 shadow-2xl shadow-emerald-500/20" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Auto-list your inventory.{" "}
            <span style={{ color: "#22c55e" }}>Effortlessly.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Scrape dealership websites, import CSV exports, and auto-fill Facebook Marketplace listings — all from one platform and a lightweight Chrome extension.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app" className="w-full sm:w-auto text-base font-semibold px-8 py-3.5 rounded-xl text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.02]" style={{ background: "#22c55e" }}>
              Launch App <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="/extension/INSTALL.md" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-base font-semibold px-8 py-3.5 rounded-xl text-white border border-white/20 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all">
              <Download className="w-4 h-4" /> Get Chrome Extension
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:py-24" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything you need to list faster</h2>
            <p className="text-gray-300 text-lg max-w-xl mx-auto">Three powerful tools that work together to move your inventory onto Facebook Marketplace in minutes, not hours.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-colors" style={{ background: "#111827" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(34,197,94,0.12)" }}>
                <Globe className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Scrape Any Dealership</h3>
              <p className="text-gray-300 leading-relaxed">
                Paste a dealership inventory URL and extract every vehicle listing automatically — titles, prices, mileage, stock numbers, and more.
              </p>
            </div>

            <div className="rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-colors" style={{ background: "#111827" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(34,197,94,0.12)" }}>
                <FileSpreadsheet className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Import Any CSV</h3>
              <p className="text-gray-300 leading-relaxed">
                Drag-and-drop your DMS or CRM export. Smart column mapping automatically detects year, make, model, price, VIN, and more from any format.
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
            <p className="text-gray-300 text-lg">Four steps from website to Facebook listing.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, icon: Search, title: "Scrape", desc: "Enter a dealership URL and let Autimik extract every vehicle." },
              { step: 2, icon: Upload, title: "Export CSV", desc: "Download your inventory as a Facebook-ready CSV file." },
              { step: 3, icon: Download, title: "Install Extension", desc: "Load the Autimik Chrome extension in your browser." },
              { step: 4, icon: Zap, title: "List", desc: "Click \"List It\" and watch the form fill automatically." },
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
          <p className="text-gray-300 mb-8 text-lg">Start scraping your first dealership in under a minute.</p>
          <Link href="/app" className="inline-flex text-base font-semibold px-10 py-3.5 rounded-xl text-white items-center justify-center gap-2 mx-auto transition-all hover:brightness-110 hover:scale-[1.02]" style={{ background: "#22c55e" }}>
            Launch App <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoSmall} alt="Autimik" className="w-6 h-6 rounded" />
            <span className="text-gray-400 text-sm">Autimik</span>
          </div>
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Autimik. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
