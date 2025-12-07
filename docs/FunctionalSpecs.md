# Functional Specifications - Task Blaster

The following functional specifications are intended to outline all key requirements for the Task Blaster application. This document serves as a high-level description of the product's expected functionalities.

## Features Overview

1. **Kanban Board**

   - Drag-and-drop task management across multiple columns (Todo, In Progress, In Review, Done)
   - Project admin user can create/define Kanban column names (Ticket Status) and set the ordering of the columns.
   - Auto-generated, human-readable task identifiers for easy reference
   - Task lifecycle tracking with automatic timestamps for task creation, start, and completion dates
   - **Sparse Numbering System**: Task positions use sparse numbering (increments of 10) for efficient drag-and-drop operations
     - New tasks start at position 10, 20, 30, etc.
     - Allows for easy insertion between existing tasks without requiring database updates for all subsequent tasks
     - Example: When inserting between position 10 and 20, new task gets position 15
     - Optimizes performance by minimizing database writes during reordering operations

2. **Project Management**

   - Create and manage multiple projects with team leaders and unique codes
   - Assign tasks to team members with type-ahead search

3. **Rich User Experience**

   - Image Attachments: Upload, view, and delete images attached to tasks
   - Markdown Support: Rich text descriptions for tasks with formatting toolbar
   - Real-time Updates: Optimistic UI updates with persistent database storage
   - Responsive Design: Adaptable UI for various screen sizes
   - Dark/Light Theme: User-selectable themes for better experience
   - Keyboard Navigation: Full keyboard accessibility
   - **Internationalization (i18n)**: Multi-language support with browser locale detection
     - **Supported Languages**: English, Spanish, French, German
     - **Automatic Detection**: Uses browser language settings with fallback to English
     - **User Preference**: Remembers language choice in localStorage
     - **Enum Translations**: Database values (TO_DO, IN_PROGRESS) display as translated text
     - **Consistent Patterns**: camelCase translation keys, nested organization by feature

4. **Image Management System**
   - **Multiple Attachments**: Each task can have multiple image attachments
   - **File Type Support**: Standard image formats (JPEG, PNG, GIF, WebP, SVG)
   - **Storage Strategy**: Environment-dependent storage approach
     - **Development**: Images stored as base64 data in PostgreSQL database tables
     - **Production**: Images stored in cloud storage (AWS S3, Google Cloud Storage, etc.)
   - **Metadata Tracking**: Original filename, content type, file size, and timestamps
   - **Thumbnail Generation**: Automatic thumbnail creation for preview purposes
   - **Storage Flexibility**: `storage_type` field supports seamless migration from local to cloud storage
   - **Access Control**: Images inherit task access permissions

5. **Tag System**

   - Task Categorization: Tags provide metadata and additional context for tasks
   - Tag Format: Tags must be lowercase with only hyphens (-) as separators
   - Tag Validation: Tags cannot start or end with a hyphen
   - Examples: "bug", "ux", "api", "testing", "reactjs-client", "user-management"
   - Cross-Project Consistency: Tags persist beyond task deletion to maintain consistency across projects
   - Tag Reusability: Same tags can be used across multiple projects and tasks
   - API-First Validation: Tag naming rules are strictly enforced at the API level for all clients
   - Agent Communication: Future AI agents will communicate via API, requiring robust server-side validation
   - Dual-Layer Enforcement: Frontend provides user experience validation, API ensures data integrity
   - Error Responses: API returns descriptive validation errors for invalid tag formats

6. **Data Formatting Standards**
   - **Keyword Values**: All keyword/enum values (status, priority, etc.) must use ENUM_CASE format
   - **Status Values**: "TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"
   - **Priority Values**: "LOW", "MEDIUM", "HIGH", "CRITICAL"
   - **Tags**: Exception to ENUM_CASE - tags use lowercase-with-hyphens format (e.g., "user-management")
   - **Consistency**: All seed data, validation schemas, and API responses must follow these standards
   - **Database Storage**: Keywords stored as ENUM_CASE values in database for consistency
   - **API Validation**: Server-side validation enforces proper keyword formats
   - **UI Display**: Enum values are translated to user-friendly text in the interface
     - Database stores: `TO_DO`, `IN_PROGRESS`, `HIGH`
     - UI displays: `"To Do"`, `"En Progreso"`, `"Alta"` (based on user's language)

7. **Development & Testing**

   - Comprehensive API documentation and testing coverage
   - Proper error handling and user feedback

## User Roles & Permissions

- **Admin**: Full project and user management capabilities
- **Member**: Task assignment and project participation
- **Project Admin**: Permission to define Kanban board settings (columns, tags, etc) for a specific project.
- **Agents**:

  - Provide functionality for users to manage their own agents and agent API credtntial (keys)
  - Provide centeralized WARP.md, CLAUDE.md, etc file management per repo or per project.
  - API access is restricted based on the project, agent credentials can not span multiple projects (security isolation)
  - Security guidelines and documentation provided to the user when setting up agent credentials

## Technical Specifications

- **Client**: React.js with a focus on modular components
- **Server**: Fastify backend with structured logging
- **Database**: PostgreSQL 15 (official image from Docker Hub). The compose file pins the major version to 15 for reproducibility.
- **Containerization**: Utilize Docker and Docker Compose

### Database

- **Schema**: Maintain existing database schema and relationships
- **ORM**: Drizzle ORM for database operations

### API

- **Development**: API-first approach, with endpoints to cover all functional areas
- **Port**: APIs served on port 3030

## Licensing

- **ISC License**: Adhere to ISC licensing for all development work
