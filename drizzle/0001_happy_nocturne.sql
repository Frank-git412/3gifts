CREATE TABLE `amazon_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `amazon_requests_created_at` ON `amazon_requests` (`created_at`);