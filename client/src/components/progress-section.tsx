import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProgressData } from "@/types/scraping";

interface ProgressSectionProps {
  progress?: ProgressData;
}

export default function ProgressSection({ progress }: ProgressSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("PATCH", `/api/scraping-jobs/${jobId}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Cancelled",
        description: "Scraping job has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping-jobs"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!progress || progress.completed) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-8" data-testid="progress-section">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Settings className="text-primary text-sm animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold">Scraping in Progress</h3>
              <p className="text-sm text-muted-foreground" data-testid="progress-status">
                {progress.statusMessage || "Analyzing page structure..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => progress.jobId && cancelMutation.mutate(progress.jobId)}
            className="text-destructive hover:text-destructive/80"
            data-testid="button-cancel-scraping"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span data-testid="progress-percentage">{progress.progress || 0}%</span>
            </div>
            <Progress value={progress.progress || 0} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div className="text-center">
              <div className="text-lg font-semibold text-primary" data-testid="progress-vehicles-found">
                {progress.vehiclesFound || 0}
              </div>
              <div className="text-xs text-muted-foreground">Vehicles Found</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600" data-testid="progress-processed">
                {progress.processed || 0}
              </div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600" data-testid="progress-errors">
                {progress.errors || 0}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-muted-foreground" data-testid="progress-time">
                {progress.timeElapsed ? formatTime(progress.timeElapsed) : "00:00:00"}
              </div>
              <div className="text-xs text-muted-foreground">Time Elapsed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
