CREATE TABLE `amazon_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `amazon_cache_expires` ON `amazon_cache` (`expires`);--> statement-breakpoint
CREATE TABLE `amazon_gate` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`lease_until` integer NOT NULL,
	`next_at` integer NOT NULL,
	`blocked_until` integer NOT NULL
);
