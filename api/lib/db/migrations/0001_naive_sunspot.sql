ALTER TABLE "TASKS" ALTER COLUMN "status" SET DEFAULT 'TO_DO';--> statement-breakpoint
ALTER TABLE "TASKS" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';--> statement-breakpoint
ALTER TABLE "TASKS" ADD COLUMN "git_feature_branch" varchar;--> statement-breakpoint
ALTER TABLE "TASKS" ADD COLUMN "git_pull_request_url" varchar;--> statement-breakpoint
ALTER TABLE "USERS" ADD COLUMN "access_token" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "USERS" ADD CONSTRAINT "USERS_access_token_unique" UNIQUE("access_token");