# HanoServices Backend - Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **PostgreSQL** (v12 or higher)
   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Create a database named `hanoservices`
   - Note your database credentials (host, port, user, password)

3. **npm** or **yarn** (comes with Node.js)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
NODE_ENV=development
PORT=3000

# Database (update with your PostgreSQL credentials)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hanoservices
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (generate a strong secret key)
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# OTP
OTP_EXPIRY_MINUTES=5
```

### 3. Set Up Database

Run the database migrations to create all tables:

```bash
npm run build
npm run db:migrate
```

Seed the database with initial service categories:

```bash
npm run db:seed
```

### 4. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port you specified in `.env`).

## Verify Installation

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","message":"HanoServices API is running",...}`

2. **API Info:**
   ```bash
   curl http://localhost:3000/api
   ```
   Should return API information.

## Project Structure

```
src/
├── config/          # Configuration files (database, app config)
├── database/        # Database migrations and seeds
├── models/          # Database models (User, Provider, etc.)
├── routes/          # API route definitions
├── controllers/     # Request handlers
├── middleware/      # Custom middleware (auth, validation)
├── services/        # Business logic layer
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server (requires build first)
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data

## API Endpoints (Initial)

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/send-otp` - Send OTP for verification
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - Login with password
- `POST /api/auth/login-otp` - Login with OTP
- `POST /api/auth/reset-password` - Reset password

### Service Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

## Next Steps

1. **Test the API** using Postman, curl, or any API client
2. **Implement remaining features:**
   - Provider management
   - Search and filtering
   - Booking system
   - Reviews and ratings
   - Payment integration (V2)

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database `hanoservices` exists

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Or stop the process using port 3000

### TypeScript Errors
- Run `npm run build` to see detailed errors
- Ensure all dependencies are installed: `npm install`

## Development Notes

- In development mode, OTP codes are logged to console for testing
- JWT tokens expire in 7 days (configurable)
- OTP expires in 5 minutes (configurable)
- All passwords are hashed using bcrypt
