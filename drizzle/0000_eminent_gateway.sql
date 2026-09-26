CREATE TABLE `calendar_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`refresh_token` text,
	`calendar_id` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_oauth` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_oauth_expiry` ON `calendar_oauth` (`expires_at`);--> statement-breakpoint
CREATE TABLE `calendar_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`google_url` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_plans_user` ON `calendar_plans` (`user_id`,`updated_at`);