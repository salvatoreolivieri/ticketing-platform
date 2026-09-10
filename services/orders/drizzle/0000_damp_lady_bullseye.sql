CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"tier_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"buyer_email" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"event_id" text NOT NULL,
	"tier_id" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_prices" (
	"tier_id" text PRIMARY KEY NOT NULL,
	"price" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_order_id_idx" ON "tickets" USING btree ("order_id");