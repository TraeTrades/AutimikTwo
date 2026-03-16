import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#0a0f1e" }}>
      <div className="w-full max-w-md mx-4 rounded-xl border border-white/10 p-8" style={{ background: "#111827" }}>
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <h1 className="text-2xl font-bold text-white">404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
