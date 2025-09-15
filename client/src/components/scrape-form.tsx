import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Play, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertScrapingJobSchema } from "@shared/schema";
import type { InsertScrapingJob } from "@shared/schema";

export default function ScrapeForm() {
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
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">New Scraping Job</h2>
            <p className="text-muted-foreground">Enter a dealership inventory URL to start scraping vehicle data</p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
            <Info size={16} />
            <span>Supports major dealership platforms</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealership URL *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://dealership.com/inventory"
                        {...field}
                        data-testid="input-dealership-url"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxVehicles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Vehicles</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="50">
                      <FormControl>
                        <SelectTrigger data-testid="select-max-vehicles">
                          <SelectValue placeholder="Select max vehicles" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="50">50 vehicles</SelectItem>
                        <SelectItem value="100">100 vehicles</SelectItem>
                        <SelectItem value="200">200 vehicles</SelectItem>
                        <SelectItem value="500">No limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="filters.vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue="all">
                      <FormControl>
                        <SelectTrigger data-testid="select-vehicle-type">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="cars">Cars</SelectItem>
                        <SelectItem value="trucks">Trucks</SelectItem>
                        <SelectItem value="suvs">SUVs</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="filters.priceRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue="any">
                      <FormControl>
                        <SelectTrigger data-testid="select-price-range">
                          <SelectValue placeholder="Any Price" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any Price</SelectItem>
                        <SelectItem value="under-20k">Under $20k</SelectItem>
                        <SelectItem value="20k-50k">$20k - $50k</SelectItem>
                        <SelectItem value="over-50k">Over $50k</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="filters.yearRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue="any">
                      <FormControl>
                        <SelectTrigger data-testid="select-year-range">
                          <SelectValue placeholder="Any Year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any Year</SelectItem>
                        <SelectItem value="2020+">2020+</SelectItem>
                        <SelectItem value="2015-2024">2015-2024</SelectItem>
                        <SelectItem value="2010-2024">2010-2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="options.includeImages"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-include-images"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Include images</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="options.autoExportCsv"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto-export"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Auto-export CSV</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                disabled={createJobMutation.isPending}
                className="flex items-center space-x-2"
                data-testid="button-start-scraping"
              >
                <Play size={16} />
                <span>{createJobMutation.isPending ? "Starting..." : "Start Scraping"}</span>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
