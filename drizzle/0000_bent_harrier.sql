CREATE TABLE `investigations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`experiment_id` text NOT NULL,
	`mode` text NOT NULL,
	`trace` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_investigations_owner_updated` ON `investigations` (`owner_id`,`updated_at`);