CREATE TABLE `restaurant_menu_categories` (
	`id` varchar(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `restaurant_menu_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurant_menu_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_menu_items` (
	`id` varchar(64) NOT NULL,
	`category_id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(300) NOT NULL DEFAULT '',
	`price` decimal(12,2) NOT NULL,
	`is_vegetarian` boolean NOT NULL DEFAULT false,
	`is_available` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `restaurant_menu_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurant_menu_items_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `housekeeping_tasks` ADD `task_type` varchar(80) DEFAULT 'Room service' NOT NULL;--> statement-breakpoint
ALTER TABLE `housekeeping_tasks` ADD `due_date` date;--> statement-breakpoint
ALTER TABLE `housekeeping_tasks` ADD `completion_notes` varchar(300) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory` ADD `sku` varchar(48) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` ADD `invoice_footer` varchar(300) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` ADD `cancellation_policy` text DEFAULT ('') NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` ADD `cancellation_cutoff_hours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` ADD `reservation_hold_hours` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurant_menu_items` ADD CONSTRAINT `fk_menu_items_category` FOREIGN KEY (`category_id`) REFERENCES `restaurant_menu_categories`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `restaurant_menu_categories_sort_idx` ON `restaurant_menu_categories` (`sort_order`);--> statement-breakpoint
CREATE INDEX `restaurant_menu_items_category_idx` ON `restaurant_menu_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `inventory_sku_idx` ON `inventory` (`sku`);