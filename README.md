# HanoServices Backend API

Backend API for HanoServices - A digital platform that helps Rwandan citizens quickly find reliable service providers.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Architecture**: Monolithic (modular design)

## Project Structure

```
src/
├── config/          # Configuration files
├── database/        # Database connection and migrations
├── models/          # Database models/schemas
├── routes/          # API routes
├── controllers/     # Request handlers
├── middleware/      # Custom middleware (auth, validation, etc.)
├── services/        # Business logic
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration

4. Set up the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for required environment variables.

## API Documentation

API documentation will be available at `/api/docs` (to be implemented).

## Features

- User Registration & Authentication (Phone + OTP)
- Service Provider Management
- Service Categories
- Search & Filtering (Location-based)
- Booking System
- Reviews & Ratings
- Provider Verification
- Admin Dashboard
- Payment Integration (V2)

## License

ISC
