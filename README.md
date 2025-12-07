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
- **UI Library**: Mantine Core components with hooks and modals
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

### Production Build

```bash
npm run build         # Build client for production
```

## Docker Configuration

### Services Overview

The `docker-compose.yml` file defines three main services:

1. **postgres** (Database):

   - PostgreSQL 15 container
   - **Container name**: `task_blaster_postgres` (what you see in Docker Desktop)
   - Port: 5433 (mapped from container 5432)
   - **Database names**: Configurable (developers typically use `task_blaster_dev` and `task_blaster_test`)
   - User: `postgres`
   - Password: `password` (configurable via `POSTGRES_PASSWORD` env var)

   **Note**: The database names are recommendations for local development safety. Production users can name their database anything (e.g., `task_blaster_db`, `task_blaster_prod`, etc.).

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

**When running API locally** (not in Docker):
```bash
# From host machine connecting to Docker postgres container (task_blaster_postgres)
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test
NODE_ENV=development
PORT=3030
```

**When running full Docker Compose** (API inside container):
```bash
# Container-to-container networking (use service name 'postgres', not 'localhost')
DATABASE_URL=postgres://postgres:password@postgres:5432/task_blaster_dev
NODE_ENV=development
PORT=3030

# Client configuration
VITE_API_URL=http://localhost:3030
```

**Note**: Database names (`task_blaster_dev`, `task_blaster_test`) are conventions for developer safety. You can use any database name you prefer (e.g., `task_blaster_db`, `myapp_db`, etc.).

## Production Deployment

### Security Best Practices

**IMPORTANT**: Never use `.env` files in production. Use your cloud provider's secrets management:

- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Azure**: Use Azure Key Vault
- **Google Cloud**: Use Secret Manager
- **Heroku**: Use Config Vars in dashboard

### Environment Variables

Configure these in your cloud provider's secrets management:

```bash
# Required
DATABASE_URL=postgres://username:password@host:port/task_blaster_prod
NODE_ENV=production

# Optional
PORT=3030
LOG_LEVEL=warn
```

### AWS ECS Example

In your ECS task definition, reference secrets:

```json
{
  "containerDefinitions": [
    {
      "name": "task-blaster-api",
      "image": "your-registry/task-blaster-api:latest",
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:task-blaster/database-url"
        },
        {
          "name": "NODE_ENV",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:task-blaster/node-env"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "3030"}
      ]
    }
  ]
}
```

### Cloud Deployment Steps

1. **Set up PostgreSQL database** in your cloud provider (RDS, Cloud SQL, etc.)
2. **Store secrets** in secrets manager (DATABASE_URL, etc.)
3. **Build Docker image** and push to container registry
4. **Configure container** to reference secrets from secrets manager
5. **Deploy API** using ECS, App Engine, or equivalent
6. **Build client** (`npm run build` in client/) 
7. **Deploy client** to CDN/static hosting (S3+CloudFront, Netlify, Vercel, etc.)

### Security Considerations

- ✅ Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- ✅ Never commit `.env` files to version control
- ✅ Use strong, unique passwords for production database
- ✅ Enable HTTPS/TLS for all connections
- ✅ Implement database backups and point-in-time recovery
- ✅ Use production database naming convention: `task_blaster_prod`
- ✅ Monitor and log all database access
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

- **Frontend**: React 18, JavaScript, Vite
- **UI Library**: Mantine Core components
- **Backend**: Fastify.js, JavaScript, PostgreSQL, Drizzle ORM
- **Development**: Docker Compose, Node.js 22+
- **Authentication**: UUID-based access tokens
- **Database**: PostgreSQL 15 with proper indexing and constraints

---

**Note**: This is the OSS version with manual user management. The paid version will include enterprise-grade user and agent management features.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
