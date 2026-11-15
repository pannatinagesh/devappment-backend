CREATE TABLE "task" (
	"id" serial PRIMARY KEY,
	"title" varchar,
	"description" varchar,
	"status" varchar,
	"priority" varchar,
	"due_date" date
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"user_name" varchar,
	"user_email" varchar
);
