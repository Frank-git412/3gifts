ALTER TABLE `claude_usage` ADD `input_tokens` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `claude_usage` ADD `output_tokens` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `claude_usage` ADD `cache_read_tokens` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `claude_usage` ADD `cache_write_tokens` integer DEFAULT 0 NOT NULL;
