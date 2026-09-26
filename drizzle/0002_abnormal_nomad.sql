CREATE TABLE `forecast_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`spot_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intelligence_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`spot_id` text NOT NULL,
	`retrieved_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_intelligence_spot_time` ON `intelligence_batches` (`spot_id`,`retrieved_at`);--> statement-breakpoint
CREATE TABLE `observation_records` (
	`id` text PRIMARY KEY NOT NULL,
	`spot_id` text NOT NULL,
	`observed_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rider_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rider_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rider_records_user` ON `rider_records` (`user_id`,`created_at`);