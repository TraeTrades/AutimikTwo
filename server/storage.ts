import { type User, type InsertUser, type Vehicle, type InsertVehicle, type ScrapingJob, type InsertScrapingJob, users, vehicles, scrapingJobs } from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, or, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Vehicle operations
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehiclesByJobId(jobId: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;
  searchVehicles(query: string, jobId?: string): Promise<Vehicle[]>;
  
  // Scraping job operations
  getScrapingJob(id: string): Promise<ScrapingJob | undefined>;
  getAllScrapingJobs(): Promise<ScrapingJob[]>;
  createScrapingJob(job: InsertScrapingJob): Promise<ScrapingJob>;
  updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob | undefined>;
  deleteScrapingJob(id: string): Promise<boolean>;
  getRecentJobs(limit?: number): Promise<ScrapingJob[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async getVehiclesByJobId(jobId: string): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.scrapingJobId, jobId));
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [updatedVehicle] = await db
      .update(vehicles)
      .set(updates)
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchVehicles(query: string, jobId?: string): Promise<Vehicle[]> {
    const conditions = [];
    
    if (jobId) {
      conditions.push(eq(vehicles.scrapingJobId, jobId));
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      conditions.push(
        or(
          like(vehicles.title, `%${lowerQuery}%`),
          like(vehicles.vin, `%${lowerQuery}%`),
          like(vehicles.make, `%${lowerQuery}%`),
          like(vehicles.model, `%${lowerQuery}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(vehicles).where(and(...conditions));
    }
    
    return await db.select().from(vehicles);
  }

  async getScrapingJob(id: string): Promise<ScrapingJob | undefined> {
    const [job] = await db.select().from(scrapingJobs).where(eq(scrapingJobs.id, id));
    return job;
  }

  async getAllScrapingJobs(): Promise<ScrapingJob[]> {
    return await db.select().from(scrapingJobs).orderBy(desc(scrapingJobs.createdAt));
  }

  async createScrapingJob(insertJob: InsertScrapingJob): Promise<ScrapingJob> {
    const [job] = await db.insert(scrapingJobs).values(insertJob).returning();
    return job;
  }

  async updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob | undefined> {
    const [updatedJob] = await db
      .update(scrapingJobs)
      .set(updates)
      .where(eq(scrapingJobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteScrapingJob(id: string): Promise<boolean> {
    const result = await db.delete(scrapingJobs).where(eq(scrapingJobs.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getRecentJobs(limit: number = 10): Promise<ScrapingJob[]> {
    return await db.select().from(scrapingJobs).orderBy(desc(scrapingJobs.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
