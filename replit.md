# Autimik 2.0 - Vehicle Inventory Scraper

## Overview

Autimik 2.0 is a full-stack web application designed for scraping vehicle inventory data from automotive dealership websites. The system provides real-time scraping capabilities, data management, export functionality, and progress tracking through WebSocket connections. Built as a modern web scraper with a clean, responsive UI for managing and viewing scraped vehicle data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui design system providing accessible, customizable components
- **Styling**: Tailwind CSS with CSS custom properties for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Real-time Updates**: WebSocket client for receiving live scraping progress updates

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API with structured error handling and request logging middleware
- **Real-time Communication**: WebSocket server using ws library for broadcasting scraping progress
- **Web Scraping**: Puppeteer for headless browser automation and dynamic content extraction
- **Session Management**: Express sessions with PostgreSQL store for user state persistence

### Data Storage
- **Database**: PostgreSQL with Neon serverless driver for cloud-native database operations
- **ORM**: Drizzle ORM for type-safe database queries and schema management
- **Schema**: Three main entities - Users, Vehicles, and Scraping Jobs with proper relationships
- **Migrations**: Drizzle Kit for database schema migrations and version control

### External Dependencies

#### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Connection Pooling**: @neondatabase/serverless for efficient database connections

#### Web Scraping Infrastructure
- **Puppeteer**: Headless Chrome automation for dynamic website scraping
- **Browser Management**: Automated browser lifecycle with memory optimization

#### Data Export Capabilities
- **CSV Export**: json2csv library for structured data export
- **Excel Export**: xlsx library for spreadsheet generation
- **Multiple Formats**: Support for CSV, JSON, and Excel export formats

#### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Modern icon library with consistent design
- **shadcn/ui**: Pre-built component system based on Radix UI with Tailwind styling

#### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Development Banner**: Runtime error overlay and development tools
- **Cartographer**: Code navigation and project structure visualization

#### Session and State Management
- **connect-pg-simple**: PostgreSQL-backed session store for Express
- **TanStack Query**: Advanced caching and synchronization for server state

#### Type Safety and Validation
- **Zod**: Runtime type validation and schema parsing
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **Drizzle Zod**: Integration between Drizzle ORM and Zod for database validation

The architecture prioritizes type safety, real-time updates, and scalable data processing while maintaining a clean separation between scraping logic, data storage, and user interface components.