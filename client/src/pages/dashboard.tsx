import { useQuery } from "@tanstack/react-query";
import { Car, Users, TrendingUp } from "lucide-react";
import ScrapeForm from "@/components/scrape-form";
import ProgressSection from "@/components/progress-section";
import Sidebar from "@/components/sidebar";
import VehicleTable from "@/components/vehicle-table";
import { useWebSocket } from "@/lib/websocket";

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
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Car className="text-primary-foreground text-sm" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Autimik 2.0</h1>
                <p className="text-xs text-muted-foreground">Vehicle Inventory Scraper</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-foreground hover:text-primary transition-colors">Dashboard</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">History</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Settings</a>
            </nav>
            <div className="flex items-center space-x-3">
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
          <Sidebar stats={stats} recentJobs={recentJobs} />
          
          <div className="lg:col-span-3">
            <ScrapeForm />
            <ProgressSection progress={progress} />
            <VehicleTable vehicles={vehicles} />
          </div>
        </div>
      </div>
    </div>
  );
}
