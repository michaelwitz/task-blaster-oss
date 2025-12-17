import { pgTable, serial, varchar, text, timestamp, integer, boolean, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Users table - using integer sequence as primary key (best practice for scalability)
export const USERS = pgTable('USERS', {
  id: serial('id').primaryKey(),
  full_name: varchar('full_name', { length: 200 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  access_token: varchar('access_token', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tags table - using tag string as primary key since it's unique and natural
export const TAGS = pgTable('TAGS', {
  tag: varchar('tag', { length: 100 }).primaryKey(), // Lowercase tag string as primary key
  color: varchar('color', { length: 7 }).notNull(), // Hex color code like #FF5733
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Status Definitions table - instance-level status codes
export const STATUS_DEFINITIONS = pgTable('STATUS_DEFINITIONS', {
  code: varchar('code', { length: 25 }).primaryKey(),
  description: varchar('description', { length: 200 }),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Translations table - stores all UI translations as JSONB
export const TRANSLATIONS = pgTable('TRANSLATIONS', {
  id: serial('id').primaryKey(),
  language_code: varchar('language_code', { length: 5 }).notNull().unique(),
  translations: text('translations').notNull(), // JSONB stored as text
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Projects table
export const PROJECTS = pgTable('PROJECTS', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  description: text('description'),
  leader_id: integer('leader_id').notNull().references(() => USERS.id, { onDelete: 'restrict' }),
  next_task_sequence: integer('next_task_sequence').notNull().default(1),
  status_workflow: varchar('status_workflow', { length: 25 }).array().notNull().default(sql`ARRAY['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']::varchar[]`),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tasks table
export const TASKS = pgTable('TASKS', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => PROJECTS.id, { onDelete: 'cascade' }),
  task_id: varchar('task_id', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('TO_DO'), // 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'
  position: integer('position').notNull().default(0), // Position within the column for ordering
  story_points: integer('story_points'),
  priority: varchar('priority', { length: 20 }).notNull().default('MEDIUM'), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  assignee_id: integer('assignee_id').references(() => USERS.id, { onDelete: 'set null' }),
  prompt: text('prompt'),
  is_blocked: boolean('is_blocked').default(false),
  blocked_reason: text('blocked_reason'),
  git_feature_branch: varchar('git_feature_branch'),
  git_pull_request_url: varchar('git_pull_request_url'),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Task-Tags junction table for many-to-many relationship
export const TASK_TAGS = pgTable('TASK_TAGS', {
  task_id: integer('task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull().references(() => TAGS.tag, { onDelete: 'cascade' }),
});

// Image metadata table
export const IMAGE_METADATA = pgTable('IMAGE_METADATA', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  original_name: varchar('original_name', { length: 255 }).notNull(),
  content_type: varchar('content_type', { length: 100 }).notNull(),
  file_size: integer('file_size').notNull(),
  url: varchar('url', { length: 500 }).notNull(), // Local DB URL or S3 URL
  storage_type: varchar('storage_type', { length: 20 }).notNull().default('local'), // 'local' or 's3'
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Image binary data table (for local storage)
export const IMAGE_DATA = pgTable('IMAGE_DATA', {
  id: integer('id').primaryKey().references(() => IMAGE_METADATA.id, { onDelete: 'cascade' }),
  data: text('data').notNull(), // Binary image data as base64 string
  thumbnail_data: text('thumbnail_data'), // Optional thumbnail data as base64 string
});

// Relations
export const usersRelations = relations(USERS, ({ many }) => ({
  assignedTasks: many(TASKS),
}));

export const projectsRelations = relations(PROJECTS, ({ one, many }) => ({
  leader: one(USERS, {
    fields: [PROJECTS.leader_id],
    references: [USERS.id],
  }),
  tasks: many(TASKS),
}));

export const tasksRelations = relations(TASKS, ({ one, many }) => ({
  project: one(PROJECTS, {
    fields: [TASKS.project_id],
    references: [PROJECTS.id],
  }),
  assignee: one(USERS, {
    fields: [TASKS.assignee_id],
    references: [USERS.id],
  }),
  taskTags: many(TASK_TAGS),
  images: many(IMAGE_METADATA),
}));

export const tagsRelations = relations(TAGS, ({ many }) => ({
  taskTags: many(TASK_TAGS),
}));

export const taskTagsRelations = relations(TASK_TAGS, ({ one }) => ({
  task: one(TASKS, {
    fields: [TASK_TAGS.task_id],
    references: [TASKS.id],
  }),
  tag: one(TAGS, {
    fields: [TASK_TAGS.tag],
    references: [TAGS.tag],
  }),
}));

export const imageMetadataRelations = relations(IMAGE_METADATA, ({ one }) => ({
  task: one(TASKS, {
    fields: [IMAGE_METADATA.task_id],
    references: [TASKS.id],
  }),
  imageData: one(IMAGE_DATA, {
    fields: [IMAGE_METADATA.id],
    references: [IMAGE_DATA.id],
  }),
}));

export const imageDataRelations = relations(IMAGE_DATA, ({ one }) => ({
  metadata: one(IMAGE_METADATA, {
    fields: [IMAGE_DATA.id],
    references: [IMAGE_METADATA.id],
  }),
}));
