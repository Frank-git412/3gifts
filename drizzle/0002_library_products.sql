-- Amazon products matched to approved library concepts.
-- ASINs are kept; title, price and image are Amazon content and are cleared
-- when they have not been refreshed within 24 hours.
CREATE TABLE `library_products` (
	`concept_id` text NOT NULL,
	`asin` text NOT NULL,
	`rank` integer NOT NULL,
	`parent_asin` text,
	`title` text,
	`price` real,
	`image_url` text,
	`detail_url` text,
	`available` integer DEFAULT 0 NOT NULL,
	`matched_at` integer NOT NULL,
	`checked_at` integer NOT NULL,
	PRIMARY KEY(`concept_id`, `asin`)
);
--> statement-breakpoint
CREATE INDEX `library_products_checked_at` ON `library_products` (`checked_at`);
--> statement-breakpoint
CREATE TABLE `library_matches` (
	`concept_id` text PRIMARY KEY NOT NULL,
	`matched_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`products` integer DEFAULT 0 NOT NULL
);
