import { TrendingUp, Users, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SidebarProps {
  stats?: {
    activeJobs: number;
    vehiclesScraped: number;
    successRate: string;
  };
  recentJobs?: Array<{
    id: string;
    url: string;
    status: string;
    vehiclesFound: number;
    createdAt: string;
  }>;
}

export default function Sidebar({ stats, recentJobs }: SidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500";
      case "running": return "bg-blue-500";
      case "failed": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return "Just now";
  };

  const getDealershipName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.split('.');
      const name = parts[parts.length - 2] || hostname;
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return "Dealership";
    }
  };

  return (
    <div className="lg:col-span-1">
      <Card className="sticky top-24">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active Jobs</span>
              <span className="text-2xl font-bold text-primary" data-testid="stat-active-jobs">
                {stats?.activeJobs || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vehicles Scraped</span>
              <span className="text-2xl font-bold text-emerald-600" data-testid="stat-vehicles-scraped">
                {stats?.vehiclesScraped || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="text-2xl font-bold text-emerald-600" data-testid="stat-success-rate">
                {stats?.successRate || "0%"}
              </span>
            </div>
          </div>
          
          <hr className="my-6 border-border" />
          
          <h3 className="text-md font-medium mb-3">Recent History</h3>
          <div className="space-y-3">
            {recentJobs?.map((job) => (
              <div 
                key={job.id} 
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
                data-testid={`recent-job-${job.id}`}
              >
                <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getDealershipName(job.url)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(job.createdAt)} • {job.vehiclesFound} vehicles
                  </p>
                </div>
              </div>
            )) || (
              <div className="text-sm text-muted-foreground">No recent jobs</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
