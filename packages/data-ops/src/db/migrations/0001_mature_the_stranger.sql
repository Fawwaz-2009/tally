PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`image_key` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`base_amount` integer NOT NULL,
	`base_currency` text NOT NULL,
	`merchant` text NOT NULL,
	`description` text,
	`categories` text,
	`expense_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_expenses`("id", "user_id", "image_key", "amount", "currency", "base_amount", "base_currency", "merchant", "description", "categories", "expense_date", "created_at") SELECT "id", "user_id", "image_key", "amount", "currency", "base_amount", "base_currency", "merchant", "description", "categories", "expense_date", "created_at" FROM `expenses`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;