import { Link } from "wouter";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <nav className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(10,15,30,0.92)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={logoSmall} alt="Autimik" className="w-8 h-8 rounded-lg" />
            <span className="text-white text-lg font-bold tracking-tight">Autimik</span>
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-1">
          Last updated: March 14, 2026
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Autimik is a product of <span className="text-gray-400 font-medium">LECdealerapps</span>.
        </p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p>
              Autimik, a product of LECdealerapps ("we", "us", or "our"), is committed to protecting your privacy. This Privacy Policy explains how the Autimik Chrome extension and web application handle your information. The short version: <strong className="text-white">we do not collect, store, or transmit any personal data.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">The Chrome Extension</h2>
            <p className="mb-4">
              The Autimik Chrome extension reads a CSV file that you select from your own device and uses it to automatically fill in vehicle listing fields on Facebook Marketplace. Here is exactly what the extension does and does not do:
            </p>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    <th className="text-left px-5 py-3 text-white font-semibold">What it does</th>
                    <th className="text-left px-5 py-3 text-white font-semibold">What it does NOT do</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Reads a CSV file you choose from your own computer", "Upload your CSV to any server"],
                    ["Fills form fields on Facebook Marketplace tabs you open", "Read or access any other tabs or websites"],
                    ["Stores your last-used vehicle list in your browser's local storage", "Send your vehicle data to Autimik or any third party"],
                    ["Communicates with Facebook Marketplace only to fill the form", "Track your browsing, location, or activity"],
                  ].map(([does, doesNot], i) => (
                    <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td className="px-5 py-3 text-gray-300">{does}</td>
                      <td className="px-5 py-3 text-gray-400">{doesNot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data We Do Not Collect</h2>
            <p className="mb-4">Autimik does not collect any of the following:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Personal identifying information (name, email, address, phone number)</li>
              <li>Vehicle inventory data or CSV file contents</li>
              <li>Facebook account information or login credentials</li>
              <li>Browsing history or website activity</li>
              <li>Location data</li>
              <li>Usage analytics or crash reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Local Storage</h2>
            <p>
              The extension may save your vehicle list to your browser's local storage so you don't have to re-select your CSV file every session. This data never leaves your browser and is not accessible to Autimik or any third party. You can clear it at any time by clearing your browser's local storage for this extension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Web Application</h2>
            <p>
              The Autimik web application (app.autimik.com or your self-hosted instance) may store scraped vehicle inventory data in a database for your session. This data is your dealership's vehicle listings — not personal data about you as a user. We do not use cookies for tracking and do not integrate any third-party analytics services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <p>
              Autimik does not share data with, sell data to, or integrate any advertising or analytics platforms. The only third-party service the extension interacts with is Facebook Marketplace — and only on tabs you explicitly open while using the extension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Permissions</h2>
            <p className="mb-4">The Chrome extension requests the following permissions:</p>
            <ul className="space-y-3">
              {[
                { perm: "activeTab", reason: "To fill in the form on the Facebook Marketplace tab you currently have open." },
                { perm: "storage", reason: "To save your vehicle list locally in your browser between sessions." },
                { perm: "scripting", reason: "To inject the auto-fill script into the Facebook Marketplace page." },
              ].map(({ perm, reason }) => (
                <li key={perm} className="flex gap-3">
                  <code className="text-xs font-mono px-2 py-0.5 rounded h-fit mt-0.5 shrink-0" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>{perm}</code>
                  <span className="text-gray-300 text-sm">{reason}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Changes to This Policy</h2>
            <p>
              If we make any changes to this Privacy Policy, we will update the "Last updated" date at the top of this page. We encourage you to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              If you have any questions about this Privacy Policy or how Autimik handles data, please contact LECdealerapps at{" "}
              <a href="mailto:privacy@autimik.com" className="underline hover:text-white transition-colors" style={{ color: "#22c55e" }}>
                privacy@autimik.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 mt-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoSmall} alt="Autimik" className="w-5 h-5 rounded" />
            <span className="text-gray-400 text-sm">Autimik</span>
          </div>
          <p className="text-gray-500 text-sm">&copy; 2026 LECdealerapps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
