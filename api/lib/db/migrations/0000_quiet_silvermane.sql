CREATE TABLE "IMAGE_DATA" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"thumbnail_data" text
);
--> statement-breakpoint
CREATE TABLE "IMAGE_METADATA" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"storage_type" varchar(20) DEFAULT 'local' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PROJECTS" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" text,
	"leader_id" integer NOT NULL,
	"next_task_sequence" integer DEFAULT 1 NOT NULL,
	"status_workflow" varchar(25)[] DEFAULT ARRAY['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']::varchar[] NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "PROJECTS_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "STATUS_DEFINITIONS" (
	"code" varchar(25) PRIMARY KEY NOT NULL,
	"description" varchar(200),
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "TAGS" (
	"tag" varchar(100) PRIMARY KEY NOT NULL,
	"color" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TASKS" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_id" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'TO_DO' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"story_points" integer,
	"priority" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
	"assignee_id" integer,
	"prompt" text,
	"is_blocked" boolean DEFAULT false,
	"blocked_reason" text,
	"git_feature_branch" varchar,
	"git_pull_request_url" varchar,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "TASKS_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "TASK_TAGS" (
	"task_id" integer NOT NULL,
	"tag" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TRANSLATIONS" (
	"id" serial PRIMARY KEY NOT NULL,
	"language_code" varchar(5) NOT NULL,
	"translations" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "TRANSLATIONS_language_code_unique" UNIQUE("language_code")
);
--> statement-breakpoint
CREATE TABLE "USERS" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "USERS_email_unique" UNIQUE("email"),
	CONSTRAINT "USERS_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
ALTER TABLE "IMAGE_DATA" ADD CONSTRAINT "IMAGE_DATA_id_IMAGE_METADATA_id_fk" FOREIGN KEY ("id") REFERENCES "public"."IMAGE_METADATA"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IMAGE_METADATA" ADD CONSTRAINT "IMAGE_METADATA_task_id_TASKS_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."TASKS"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PROJECTS" ADD CONSTRAINT "PROJECTS_leader_id_USERS_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."USERS"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PROJECTS" ADD CONSTRAINT "PROJECTS_created_by_USERS_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PROJECTS" ADD CONSTRAINT "PROJECTS_updated_by_USERS_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "STATUS_DEFINITIONS" ADD CONSTRAINT "STATUS_DEFINITIONS_created_by_USERS_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "STATUS_DEFINITIONS" ADD CONSTRAINT "STATUS_DEFINITIONS_updated_by_USERS_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TASKS" ADD CONSTRAINT "TASKS_project_id_PROJECTS_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."PROJECTS"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TASKS" ADD CONSTRAINT "TASKS_assignee_id_USERS_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TASK_TAGS" ADD CONSTRAINT "TASK_TAGS_task_id_TASKS_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."TASKS"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TASK_TAGS" ADD CONSTRAINT "TASK_TAGS_tag_TAGS_tag_fk" FOREIGN KEY ("tag") REFERENCES "public"."TAGS"("tag") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TRANSLATIONS" ADD CONSTRAINT "TRANSLATIONS_created_by_USERS_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TRANSLATIONS" ADD CONSTRAINT "TRANSLATIONS_updated_by_USERS_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."USERS"("id") ON DELETE set null ON UPDATE no action;