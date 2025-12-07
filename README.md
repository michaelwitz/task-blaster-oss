# Task Blaster

Task Blaster is a Kanban-style orchestration management application intended to coordinate AI agents and human users. The main use case is a software project, but this application could serve any project where a Kanban agile management style would be appropriate.

This repository contains the **OSS (Open Source Software)** version of Task Blaster. A paid subscription version with more features is in work.

In the OSS version, agents and users are granted access to use the management software using UUID token authentication. The users must be manually configured using a database seeding script. The paid version will have enterprise-grade user and agent management features.

## Features

- **Kanban Board Management**: Visual task organization with drag-and-drop functionality
- **Multi-Project Support**: Manage multiple projects with separate boards
- **Tag System**: Categorize tasks with customizable tags and colors
- **User Management**: Manual user configuration via database seeding
- **Token Authentication**: UUID-based token authentication for users and agents
- **Real-time Updates**: Live synchronization across all connected clients
- **Multi-language Support**: Internationalization for global teams

## Architecture

- **Frontend**: React.js with JavaScript, Vite build tool
- **Backend**: Fastify.js API server (JavaScript)
- **Database**: PostgreSQL 15 with Drizzle ORM
- **Containerization**: Docker Compose for easy deployment
- **Authentication**: UUID-based token system

## Quick Start

### Prerequisites

- **Docker Desktop**: [Download and install](https://www.docker.com/products/docker-desktop/)
- **Node.js**: Version 22 LTS or higher
- **Git**: For cloning the repository

### Complete Setup with Docker Compose

This application uses Docker Compose for easy local development. The setup includes:

- **PostgreSQL Database**: Running on port 5433
- **Fastify API Server**: Running on port 3030
- **React Client**: Running on port 3001

### Step 1: Clone the Repository

```bash
git clone https://github.com/michaelwitz/task-blaster-oss.git
cd task-blaster-oss
```

### Step 2: Environment Configuration

1. **Create the environment file**:

   ```bash
   cp api/.env.example api/.env
   ```

2. **Edit the environment file** (`api/.env`):

   ```bash
   # Developer's working database - for manual testing and exploration
   DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev

   # Test database - used ONLY by automated test suite (npm run test)
   # This database is cleared and re-seeded by tests - do not use for manual work
   DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test

   # Application settings
   NODE_ENV=development
   PORT=3030
   ```

   **Note**: Task Blaster uses separate databases for development (`task_blaster_dev`) and testing (`task_blaster_test`) to prevent accidental data loss. See "Testing" section below for test database setup.

3. **Set Docker environment variable** (optional, for production):
   ```bash
   export POSTGRES_PASSWORD=password
   ```

### Step 3: Start the Application

#### Option A: Full Docker Compose Setup (Recommended)

1. **Install dependencies**:

   ```bash
   # Install API dependencies
   cd api
   npm install

   # Install client dependencies
   cd ../client
   npm install

   # Return to root
   cd ..
   ```

2. **Start all services with Docker Compose**:

   ```bash
   npm run docker:up
   ```

3. **Run database migrations**:

   ```bash
   npm run db:migrate
   ```

4. **Seed the database with initial data**:

   ```bash
   npm run db:seed
   ```

5. **Access the application**:
   - Frontend: http://localhost:3001
   - API: http://localhost:3030

#### Option B: Mixed Development Setup

1. **Install dependencies**:

   ```bash
   # Install API dependencies
   cd api
   npm install

   # Install client dependencies
   cd ../client
   npm install

   # Return to root
   cd ..
   ```

2. **Start only the database with Docker**:

   ```bash
   npm run docker:up:db
   ```

3. **Run database migrations**:

   ```bash
   npm run db:migrate
   ```

4. **Seed the database with initial data**:

   ```bash
   npm run db:seed
   ```

5. **Start the API server locally**:

   ```bash
   npm run dev:api
   ```

6. **In a new terminal, start the React client locally**:

   ```bash
   npm run dev:client
   ```

7. **Access the application**:
   - Frontend: http://localhost:3001
   - API: http://localhost:3030

### Step 4: User Setup

The OSS version requires manual user configuration:

1. **Run the user seeding script**:

   ```bash
   cd api
   node scripts/seedUsers.js
   ```

2. **Get your access token** from the seeded users and use it in the client application

3. **Configure users in the database** or use the provided seeding scripts in `api/scripts/seeders/`

## Development Commands

### Database Operations

```bash
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed with test data
npm run db:reset      # Reset and seed database
```

### Docker Operations

```bash
npm run docker:up     # Start all services (database, API, client)
npm run docker:up:db  # Start only PostgreSQL database
npm run docker:down   # Stop all containers
npm run docker:logs   # View container logs
```

### Testing

```bash
# From api/ directory - source .env first to load DATABASE_URL_TEST
cd api
set -a && source .env && set +a && NODE_ENV=test npm run test

# Or use npm scripts (after sourcing .env)
npm run test              # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

**First-time test database setup**:

```bash
# 1. Create test database
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"

# 2. Run migrations
cd api
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:migrate

# 3. Seed test database
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:seed
```

**Safety Note**: Tests automatically use `DATABASE_URL_TEST` (not `DATABASE_URL`) to keep your development data safe. The test database is cleared and re-seeded before each test run.

For detailed testing documentation, see `api/__tests__/README.md`.

### Development Servers

```bash
npm run dev           # Start both API and client
npm run dev:api       # API only (port 3030)
npm run dev:client    # Client only (port 3001)
```

### Editor Integration

- **Neovim/Vim**: Full support for editing project files
- **Warp Terminal**: Enhanced experience with Vim keybindings available in Warp's input editor

### Production Build

```bash
npm run build         # Build client for production
```

## Docker Configuration

### Services Overview

The `docker-compose.yml` file defines three main services:

1. **postgres** (Database):

   - PostgreSQL 15 container
   - Port: 5433 (mapped from container 5432)
   - Database: `task_blaster_db`
   - User: `postgres`
   - Password: `password` (configurable via `POSTGRES_PASSWORD` env var)

2. **api** (Backend):

   - Fastify API server
   - Port: 3030
   - Hot reload enabled for development
   - Depends on postgres service

3. **client** (Frontend):
   - React development server
   - Port: 3001
   - Hot reload enabled for development
   - Depends on api service

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Start only database
docker-compose up postgres -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose build

# Remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Environment Variables

The Docker setup uses these environment variables:

```bash
# Database password (default: password)
POSTGRES_PASSWORD=your_secure_password

# API configuration
DATABASE_URL=postgres://postgres:password@postgres:5432/task_blaster_db
NODE_ENV=development
PORT=3030

# Client configuration
VITE_API_URL=http://localhost:3030
```

## Production Deployment

### Environment Variables

For production deployment, ensure these environment variables are properly configured:

```bash
# Required
DATABASE_URL=postgres://username:password@host:port/database
NODE_ENV=production

# Optional
PORT=3030
LOG_LEVEL=info
```

### Cloud Deployment

1. **Set up a PostgreSQL database** in your cloud provider
2. **Configure environment variables** in your cloud platform
3. **Deploy the API** using your preferred method (Docker, Heroku, etc.)
4. **Build and deploy the client** to a static hosting service

### Security Considerations

- **Never commit `.env` files** to version control
- **Use strong, unique passwords** for database
- **Enable HTTPS** in production
- **Monitor database access** and implement proper backup strategies
- **Rotate access tokens** periodically for security

## API Documentation

### Authentication

The OSS version uses UUID-based token authentication:

1. **Users are seeded** with permanent UUID access tokens
2. **Include the token** in request headers: `TB_TOKEN: <token>` or `Authorization: Bearer <token>`
3. **Tokens are permanent** until manually changed in the database

### Key Endpoints

- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `GET /api/projects` - Retrieve all projects
- `GET /api/tags` - Retrieve all tags

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m "feat: your feature description"`
4. Push to your branch: `git push origin feature/your-feature`
5. Create a pull request

## License

This project is licensed under the ISC License.

## Support

For the OSS version:

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: Check the `docs/` directory for detailed specifications
- **Community**: Join discussions in GitHub Discussions

For enterprise features and support, contact us about the paid subscription version.

## Architecture Details

### Monorepo Structure

```
task-blaster-oss/
├── api/                 # Fastify API server
│   ├── lib/db/         # Database schema and migrations
│   ├── src/            # API source code
│   └── scripts/        # Database seeding scripts
├── client/             # React TypeScript application
│   ├── src/            # Frontend source code
│   └── public/         # Static assets
└── docs/               # Project documentation
```

### Technology Stack

- **Frontend**: React 18, JavaScript, Vite, Tailwind CSS
- **Backend**: Fastify.js, JavaScript, PostgreSQL, Drizzle ORM
- **Development**: Docker Compose, Node.js 22+
- **Authentication**: UUID-based access tokens
- **Database**: PostgreSQL 15 with proper indexing and constraints

---

**Note**: This is the OSS version with manual user management. The paid version will include enterprise-grade user and agent management features.
