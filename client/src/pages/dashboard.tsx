import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Link } from "wouter";
import ScrapeForm from "@/components/scrape-form";
import ProgressSection from "@/components/progress-section";
import Sidebar from "@/components/sidebar";
import VehicleTable from "@/components/vehicle-table";
import { useWebSocket } from "@/lib/websocket";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: recentJobs } = useQuery({
    queryKey: ["/api/scraping-jobs/recent"],
  });

  const { data: vehicles } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  const { progress, isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <img src={logoSmall} alt="Autimik" className="w-8 h-8 rounded-lg cursor-pointer" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Autimik 2.0</h1>
                <p className="text-xs text-muted-foreground">Vehicle Inventory Scraper</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/app" className="text-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/import" className="text-muted-foreground hover:text-primary transition-colors">Import CSV</Link>
              <Link href="/demo" className="text-muted-foreground hover:text-primary transition-colors">Extension Demo</Link>
            </nav>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5" title={isConnected ? "Live updates connected" : "Live updates disconnected"}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                <span className="text-xs text-muted-foreground hidden sm:inline">{isConnected ? "Live" : "Offline"}</span>
              </div>
              <span className="text-sm text-muted-foreground hidden sm:inline">user@company.com</span>
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <Users className="text-muted-foreground text-sm" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Sidebar stats={stats as any} recentJobs={recentJobs as any} />
          
          <div className="lg:col-span-3">
            <ScrapeForm />
            <ProgressSection progress={progress} />
            <VehicleTable vehicles={vehicles as any} />
          </div>
        </div>
      </div>
    </div>
  );
}
