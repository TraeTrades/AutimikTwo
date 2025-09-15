export interface ProgressData {
  jobId?: string;
  progress?: number;
  vehiclesFound?: number;
  processed?: number;
  errors?: number;
  statusMessage?: string;
  timeElapsed?: number;
  completed?: boolean;
  error?: string;
}

export interface FilterData {
  vehicleType?: string;
  priceRange?: string;
  yearRange?: string;
  make?: string;
  model?: string;
}

export interface ExportOptions {
  format: "csv" | "json" | "excel";
  fields: string[];
  vehicleIds?: string[];
}
