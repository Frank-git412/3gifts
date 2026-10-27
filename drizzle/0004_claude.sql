ALTER TABLE `library_products` ADD `ai_verdict` integer;
--> statement-breakpoint
ALTER TABLE `library_products` ADD `ai_reason` text;
--> statement-breakpoint
CREATE TABLE `claude_usage` (
	`day` text PRIMARY KEY NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
