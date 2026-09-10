CREATE TABLE "availability" (
	"tier_id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"quantity_total" integer NOT NULL,
	"quantity_remaining" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"order_id" text PRIMARY KEY NOT NULL,
	"tier_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "holds_expires_at_idx" ON "holds" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "holds_tier_id_idx" ON "holds" USING btree ("tier_id");