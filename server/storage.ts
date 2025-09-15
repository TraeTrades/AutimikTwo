import { type User, type InsertUser, type Vehicle, type InsertVehicle, type ScrapingJob, type InsertScrapingJob } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private vehicles: Map<string, Vehicle>;
  private scrapingJobs: Map<string, ScrapingJob>;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.scrapingJobs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehiclesByJobId(jobId: string): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(
      (vehicle) => vehicle.scrapingJobId === jobId
    );
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    const vehicle: Vehicle = { 
      ...insertVehicle, 
      id, 
      createdAt: new Date(),
      type: insertVehicle.type || null,
      transmission: insertVehicle.transmission || null,
      drivetrain: insertVehicle.drivetrain || null,
      exteriorColor: insertVehicle.exteriorColor || null,
      interiorColor: insertVehicle.interiorColor || null,
      fuelType: insertVehicle.fuelType || null,
      price: insertVehicle.price || null,
      mileage: insertVehicle.mileage || null,
      imageUrl: insertVehicle.imageUrl || null,
      make: insertVehicle.make || null,
      model: insertVehicle.model || null,
      year: insertVehicle.year || null,
      dealershipUrl: insertVehicle.dealershipUrl || null,
      scrapingJobId: insertVehicle.scrapingJobId || null
    };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return undefined;
    
    const updatedVehicle = { ...vehicle, ...updates };
    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    return this.vehicles.delete(id);
  }

  async searchVehicles(query: string, jobId?: string): Promise<Vehicle[]> {
    const vehicles = Array.from(this.vehicles.values());
    const filtered = jobId ? vehicles.filter(v => v.scrapingJobId === jobId) : vehicles;
    
    if (!query) return filtered;
    
    const lowerQuery = query.toLowerCase();
    return filtered.filter(vehicle => 
      vehicle.title.toLowerCase().includes(lowerQuery) ||
      vehicle.vin.toLowerCase().includes(lowerQuery) ||
      vehicle.make?.toLowerCase().includes(lowerQuery) ||
      vehicle.model?.toLowerCase().includes(lowerQuery)
    );
  }

  async getScrapingJob(id: string): Promise<ScrapingJob | undefined> {
    return this.scrapingJobs.get(id);
  }

  async getAllScrapingJobs(): Promise<ScrapingJob[]> {
    return Array.from(this.scrapingJobs.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createScrapingJob(insertJob: InsertScrapingJob): Promise<ScrapingJob> {
    const id = randomUUID();
    const job: ScrapingJob = { 
      ...insertJob, 
      id, 
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      vehiclesFound: 0,
      vehiclesProcessed: 0,
      errors: 0,
      status: "pending",
      errorMessage: null,
      maxVehicles: insertJob.maxVehicles || null,
      filters: insertJob.filters || null,
      options: insertJob.options || null
    };
    this.scrapingJobs.set(id, job);
    return job;
  }

  async updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob | undefined> {
    const job = this.scrapingJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.scrapingJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteScrapingJob(id: string): Promise<boolean> {
    return this.scrapingJobs.delete(id);
  }

  async getRecentJobs(limit: number = 10): Promise<ScrapingJob[]> {
    const jobs = await this.getAllScrapingJobs();
    return jobs.slice(0, limit);
  }
}

export const storage = new MemStorage();
