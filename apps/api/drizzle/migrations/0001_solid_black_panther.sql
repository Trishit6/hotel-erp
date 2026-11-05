CREATE TABLE `system_settings` (
	`id` varchar(64) NOT NULL,
	`hotel_name` varchar(120) NOT NULL,
	`legal_name` varchar(160) NOT NULL DEFAULT '',
	`email` varchar(191) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`website` varchar(200) NOT NULL DEFAULT '',
	`address_line_1` varchar(200) NOT NULL DEFAULT '',
	`address_line_2` varchar(200) NOT NULL DEFAULT '',
	`city` varchar(80) NOT NULL DEFAULT '',
	`state` varchar(80) NOT NULL DEFAULT '',
	`postal_code` varchar(10) NOT NULL DEFAULT '',
	`country` varchar(80) NOT NULL DEFAULT 'India',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`currency` varchar(8) NOT NULL DEFAULT 'INR',
	`tax_rate_bps` int NOT NULL DEFAULT 1200,
	`check_in_time` varchar(8) NOT NULL DEFAULT '14:00',
	`check_out_time` varchar(8) NOT NULL DEFAULT '11:00',
	`invoice_prefix` varchar(16) NOT NULL DEFAULT 'INV',
	`logo_url` varchar(500) NOT NULL DEFAULT '',
	`updated_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
INSERT INTO `system_settings` (
	`id`, `hotel_name`, `legal_name`, `email`, `phone`, `website`,
	`address_line_1`, `address_line_2`, `city`, `state`, `postal_code`, `country`,
	`timezone`, `currency`, `tax_rate_bps`, `check_in_time`, `check_out_time`,
	`invoice_prefix`, `logo_url`, `updated_at`
) VALUES (
	'default', 'RIVR Hotel & Residences', 'RIVR Hospitality Private Limited',
	'stay@rivrhotel.in', '+91 22 0000 0000', '',
	'RIVR Hotel & Residences', 'Hotel address to be configured', 'Mumbai', 'Maharashtra', '400001', 'India',
	'Asia/Kolkata', 'INR', 1200, '14:00', '11:00',
	'INV', '', NOW()
);