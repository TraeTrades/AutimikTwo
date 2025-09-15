import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vin: varchar("vin", { length: 17 }).notNull(),
  title: text("title").notNull(),
  price: text("price"),
  mileage: text("mileage"),
  imageUrl: text("image_url"),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  type: text("type"),
  transmission: text("transmission"),
  drivetrain: text("drivetrain"),
  exteriorColor: text("exterior_color"),
  interiorColor: text("interior_color"),
  fuelType: text("fuel_type"),
  dealershipUrl: text("dealership_url"),
  scrapingJobId: varchar("scraping_job_id").references(() => scrapingJobs.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, cancelled
  progress: integer("progress").default(0),
  vehiclesFound: integer("vehicles_found").default(0),
  vehiclesProcessed: integer("vehicles_processed").default(0),
  errors: integer("errors").default(0),
  maxVehicles: integer("max_vehicles").default(50),
  filters: jsonb("filters"),
  options: jsonb("options"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
});

export const insertScrapingJobSchema = createInsertSchema(scrapingJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
}).extend({
  url: z.string().url("Must be a valid URL"),
  maxVehicles: z.number().min(1).max(500).optional(),
  filters: z.object({
    vehicleType: z.string().optional(),
    priceRange: z.string().optional(),
    yearRange: z.string().optional(),
  }).optional(),
  options: z.object({
    includeImages: z.boolean().optional(),
    autoExportCsv: z.boolean().optional(),
  }).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = z.infer<typeof insertScrapingJobSchema>;
