CREATE TABLE `media_gallery` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text NOT NULL,
	`thumbnail_url` text,
	`mime_type` text,
	`file_size` integer,
	`created_at` integer NOT NULL
);
