CREATE TABLE `auth_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`email` text NOT NULL,
	`challenge` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_codes_expiry` ON `auth_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_auth_codes_owner` ON `auth_codes` (`owner_id`);--> statement-breakpoint
CREATE TABLE `gateway_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_gateway_sessions_expiry` ON `gateway_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_gateway_sessions_owner_expiry` ON `gateway_sessions` (`owner_id`,`expires_at`);