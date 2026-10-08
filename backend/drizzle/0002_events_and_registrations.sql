CREATE TYPE "public"."event_status" AS ENUM('draft', 'pending', 'approved', 'cancelled', 'finished');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"max_members" integer,
	"current_members" integer DEFAULT 0 NOT NULL,
	"status" "event_status" DEFAULT 'pending' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"manager_id" uuid NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_current_members_check" CHECK ("events"."current_members" >= 0)
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_event_volunteer_unique" UNIQUE("event_id","volunteer_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_status_start_at_idx" ON "events" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "events_start_at_idx" ON "events" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "events_manager_id_idx" ON "events" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "events_tags_idx" ON "events" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "registrations_volunteer_id_idx" ON "registrations" USING btree ("volunteer_id");