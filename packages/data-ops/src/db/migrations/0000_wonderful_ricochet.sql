CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`image_key` text,
	`captured_at` integer NOT NULL,
	`extraction_metadata` text,
	`amount` integer,
	`currency` text,
	`base_amount` integer,
	`base_currency` text,
	`merchant` text,
	`description` text,
	`categories` text,
	`expense_date` integer,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`base_currency` text DEFAULT 'USD' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
