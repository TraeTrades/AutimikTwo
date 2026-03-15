import { useQuery } from "@tanstack/react-query";
import { Users, Zap, Car, TrendingUp, Search, Loader2, X, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ScrapeForm from "@/components/scrape-form";
import VehicleTable from "@/components/vehicle-table";
import { useWebSocket } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import logoSmall from "@assets/autimik-icon-48_1773364287680.png";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: vehicles } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  const { progress, isConnected } = useWebSocket();

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("PATCH", `/api/scraping-jobs/${jobId}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Job Cancelled", description: "Scraping job has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping-jobs"] });
    },
  });

  const vehicleList = (vehicles as any[]) || [];
  const isRunning = progress && !progress.completed;
  const hasFailed = progress?.completed && !!progress.error;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <img src={logoSmall} alt="Autimik" className="w-7 h-7 rounded-lg cursor-pointer" />
              </Link>
              <h1 className="text-lg font-semibold text-foreground">Autimik</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-5 text-sm">
              <Link href="/app" className="text-foreground font-medium">Dashboard</Link>
              <Link href="/import" className="text-muted-foreground hover:text-foreground transition-colors">Import CSV</Link>
              <Link href="/demo" className="text-muted-foreground hover:text-foreground transition-colors">Extension Demo</Link>
            </nav>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5" title={isConnected ? "Live updates connected" : "Live updates disconnected"}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                <span className="text-xs text-muted-foreground hidden sm:inline">{isConnected ? "Live" : "Offline"}</span>
              </div>
              <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center">
                <Users className="text-muted-foreground" size={14} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <ScrapeForm />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <span className="text-sm text-muted-foreground">Active Jobs</span>
            </div>
            <span className="text-lg font-bold text-primary" data-testid="stat-active-jobs">{(stats as any)?.activeJobs || 0}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car size={16} className="text-emerald-500" />
              <span className="text-sm text-muted-foreground">Vehicles</span>
            </div>
            <span className="text-lg font-bold text-emerald-500" data-testid="stat-vehicles-scraped">{(stats as any)?.vehiclesScraped || 0}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <span className="text-sm text-muted-foreground">Success</span>
            </div>
            <span className="text-lg font-bold text-emerald-500" data-testid="stat-success-rate">{(stats as any)?.successRate || "0%"}</span>
          </div>
        </div>

        {isRunning && (
          <div className="mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3" data-testid="progress-section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-primary animate-spin" />
                <span className="text-sm font-medium" data-testid="progress-status">
                  {progress.statusMessage || "Scraping in progress..."}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground" data-testid="progress-percentage">{progress.progress || 0}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => progress.jobId && cancelMutation.mutate(progress.jobId)}
                  data-testid="button-cancel-scraping"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
            <Progress value={progress.progress || 0} className="h-1.5" />
          </div>
        )}

        {hasFailed && (
          <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3" data-testid="progress-section">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <div>
                <span className="text-sm font-medium text-red-500">Scraping Failed</span>
                <p className="text-sm text-muted-foreground mt-0.5">{progress?.error}</p>
              </div>
            </div>
          </div>
        )}

        {vehicleList.length === 0 && !isRunning && !hasFailed ? (
          <div className="border border-dashed border-border rounded-xl py-16 px-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
              <Search size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No inventory yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Paste a dealership inventory URL above to start scraping vehicle data, or import a CSV file.
            </p>
            <div className="max-w-lg mx-auto">
              <ScrapeForm compact />
            </div>
          </div>
        ) : (
          <VehicleTable vehicles={vehicleList} showFbExport={progress?.completed && !progress.error && (progress.vehiclesFound || 0) > 0} />
        )}
      </div>
    </div>
  );
}
