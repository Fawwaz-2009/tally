CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`amount` integer,
	`currency` text,
	`base_amount` integer,
	`base_currency` text,
	`merchant` text,
	`description` text,
	`categories` text,
	`user_id` text NOT NULL,
	`screenshot_path` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`processed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
