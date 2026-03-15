import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertScrapingJobSchema } from "@shared/schema";
import type { InsertScrapingJob } from "@shared/schema";

interface ScrapeFormProps {
  compact?: boolean;
}

export default function ScrapeForm({ compact }: ScrapeFormProps) {
  const [showOptions, setShowOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertScrapingJob>({
    resolver: zodResolver(insertScrapingJobSchema),
    defaultValues: {
      url: "",
      maxVehicles: 50,
      filters: {
        vehicleType: "all",
        priceRange: "any",
        yearRange: "any",
      },
      options: {
        includeImages: true,
        autoExportCsv: true,
      },
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: InsertScrapingJob) => {
      const response = await apiRequest("POST", "/api/scraping-jobs", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Scraping Started",
        description: "Your scraping job has been started successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scraping-jobs/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertScrapingJob) => {
    createJobMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex items-center gap-2">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder="Paste dealership inventory URL..."
                      className={compact ? "pl-10 h-11" : "pl-10 h-12 text-base"}
                      {...field}
                      data-testid="input-dealership-url"
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={createJobMutation.isPending}
            className={compact ? "h-11 px-5" : "h-12 px-6 text-base"}
            data-testid="button-start-scraping"
          >
            {createJobMutation.isPending ? "Starting..." : "Scrape Inventory"}
          </Button>
        </div>

        {!compact && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Options
            </button>

            {showOptions && (
              <div className="mt-2 flex items-center gap-3">
                <FormField
                  control={form.control}
                  name="maxVehicles"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Max vehicles:</span>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="50">
                        <FormControl>
                          <SelectTrigger className="w-[130px] h-8" data-testid="select-max-vehicles">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                          <SelectItem value="500">No limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </form>
    </Form>
  );
}
