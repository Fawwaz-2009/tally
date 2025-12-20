-- Migration: Merchant-Category Refactor
-- Link categories to merchants instead of expenses

PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- Step 1: Create merchants table
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`category` text,
	`created_at` integer NOT NULL
);--> statement-breakpoint

-- Step 2: Create unique index on merchant name
CREATE UNIQUE INDEX `merchants_name_unique` ON `merchants` (`name`);--> statement-breakpoint

-- Step 3: Populate merchants from existing expenses
-- For each unique merchant, create a merchant record with first category (if any)
INSERT INTO `merchants` (`id`, `name`, `display_name`, `category`, `created_at`)
SELECT
	lower(hex(randomblob(16))),
	lower(`merchant`),
	`merchant`,
	json_extract(`categories`, '$[0]'),
	unixepoch() * 1000
FROM `expenses`
GROUP BY lower(`merchant`);--> statement-breakpoint

-- Step 4: Create new expenses table with merchant_id FK
CREATE TABLE `__new_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`merchant_id` text NOT NULL,
	`image_key` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`base_amount` integer NOT NULL,
	`base_currency` text NOT NULL,
	`description` text,
	`expense_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

-- Step 5: Migrate expenses data with merchant_id lookup
INSERT INTO `__new_expenses`(`id`, `user_id`, `merchant_id`, `image_key`, `amount`, `currency`, `base_amount`, `base_currency`, `description`, `expense_date`, `created_at`)
SELECT
	e.`id`,
	e.`user_id`,
	m.`id`,
	e.`image_key`,
	e.`amount`,
	e.`currency`,
	e.`base_amount`,
	e.`base_currency`,
	e.`description`,
	e.`expense_date`,
	e.`created_at`
FROM `expenses` e
INNER JOIN `merchants` m ON lower(e.`merchant`) = m.`name`;--> statement-breakpoint

-- Step 6: Drop old expenses table and rename new one
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint

PRAGMA foreign_keys=ON;
