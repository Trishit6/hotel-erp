CREATE TABLE `branches` (
	`id` varchar(64) NOT NULL,
	`hotel_id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(24) NOT NULL,
	`address_line_1` varchar(200) NOT NULL DEFAULT '',
	`city` varchar(80) NOT NULL DEFAULT '',
	`state` varchar(80) NOT NULL DEFAULT '',
	`postal_code` varchar(10) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `check_ins` (
	`id` varchar(64) NOT NULL,
	`reservation_id` varchar(64) NOT NULL,
	`room_id` varchar(64) NOT NULL,
	`checked_in_at` datetime NOT NULL,
	`checked_in_by` varchar(64),
	`notes` varchar(300) NOT NULL DEFAULT '',
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`),
	CONSTRAINT `check_ins_reservation_unique` UNIQUE(`reservation_id`)
);
--> statement-breakpoint
CREATE TABLE `check_outs` (
	`id` varchar(64) NOT NULL,
	`reservation_id` varchar(64) NOT NULL,
	`room_id` varchar(64) NOT NULL,
	`checked_out_at` datetime NOT NULL,
	`checked_out_by` varchar(64),
	`notes` varchar(300) NOT NULL DEFAULT '',
	CONSTRAINT `check_outs_id` PRIMARY KEY(`id`),
	CONSTRAINT `check_outs_reservation_unique` UNIQUE(`reservation_id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` varchar(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`legal_name` varchar(160) NOT NULL DEFAULT '',
	`email` varchar(191) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`website` varchar(200) NOT NULL DEFAULT '',
	`address_line_1` varchar(200) NOT NULL DEFAULT '',
	`city` varchar(80) NOT NULL DEFAULT '',
	`state` varchar(80) NOT NULL DEFAULT '',
	`postal_code` varchar(10) NOT NULL DEFAULT '',
	`country` varchar(80) NOT NULL DEFAULT 'India',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `hotels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `housekeeping_status` (
	`code` varchar(32) NOT NULL,
	`label` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `housekeeping_status_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `housekeeping_task_history` (
	`id` varchar(64) NOT NULL,
	`task_id` varchar(64) NOT NULL,
	`status` enum('dirty','assigned','in-progress','cleaned','inspected') NOT NULL,
	`note` varchar(300) NOT NULL DEFAULT '',
	`changed_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `housekeeping_task_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` varchar(64) NOT NULL,
	`inventory_id` varchar(64) NOT NULL,
	`type` enum('in','out','adjustment') NOT NULL,
	`quantity` int NOT NULL,
	`note` varchar(300) NOT NULL DEFAULT '',
	`created_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(64) NOT NULL,
	`email` varchar(191) NOT NULL,
	`role` varchar(32) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`invited_by` varchar(64),
	`expires_at` datetime NOT NULL,
	`accepted_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_email_unique` UNIQUE(`email`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` varchar(64) NOT NULL,
	`invoice_id` varchar(64) NOT NULL,
	`description` varchar(200) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` varchar(64) NOT NULL,
	`staff_id` varchar(64) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`type` varchar(40) NOT NULL DEFAULT 'casual',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reason` varchar(300) NOT NULL DEFAULT '',
	`decided_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64),
	`title` varchar(160) NOT NULL,
	`body` varchar(500) NOT NULL DEFAULT '',
	`read_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`code` varchar(64) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `permissions_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` varchar(64) NOT NULL,
	`payment_id` varchar(64) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` varchar(300) NOT NULL DEFAULT '',
	`status` enum('pending','approved','processed','rejected') NOT NULL DEFAULT 'pending',
	`processed_by` varchar(64),
	`processed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_guests` (
	`id` varchar(64) NOT NULL,
	`reservation_id` varchar(64) NOT NULL,
	`guest_id` varchar(64) NOT NULL,
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservation_guests_id` PRIMARY KEY(`id`),
	CONSTRAINT `reservation_guests_unique` UNIQUE(`reservation_id`,`guest_id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_status_history` (
	`id` varchar(64) NOT NULL,
	`reservation_id` varchar(64) NOT NULL,
	`from_status` varchar(32),
	`to_status` varchar(32) NOT NULL,
	`note` varchar(300) NOT NULL DEFAULT '',
	`changed_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservation_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_order_items` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`menu_item_id` varchar(64),
	`name` varchar(120) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `restaurant_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_code` varchar(32) NOT NULL,
	`permission_code` varchar(64) NOT NULL,
	CONSTRAINT `role_permissions_role_code_permission_code_pk` PRIMARY KEY(`role_code`,`permission_code`)
);
--> statement-breakpoint
CREATE TABLE `room_amenities` (
	`id` varchar(64) NOT NULL,
	`room_id` varchar(64) NOT NULL,
	`amenity` varchar(120) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `room_amenities_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_amenities_room_name_unique` UNIQUE(`room_id`,`amenity`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` varchar(64) NOT NULL,
	`name` varchar(64) NOT NULL,
	`start_time` varchar(8) NOT NULL,
	`end_time` varchar(8) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`),
	CONSTRAINT `shifts_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`contact_name` varchar(120) NOT NULL DEFAULT '',
	`email` varchar(191) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`address` varchar(300) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `branches` ADD CONSTRAINT `branches_hotel_id_hotels_id_fk` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_checked_in_by_users_id_fk` FOREIGN KEY (`checked_in_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `check_outs` ADD CONSTRAINT `check_outs_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `check_outs` ADD CONSTRAINT `check_outs_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `check_outs` ADD CONSTRAINT `check_outs_checked_out_by_users_id_fk` FOREIGN KEY (`checked_out_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `housekeeping_task_history` ADD CONSTRAINT `housekeeping_task_history_task_id_housekeeping_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `housekeeping_tasks`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `housekeeping_task_history` ADD CONSTRAINT `housekeeping_task_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_inventory_id_inventory_id_fk` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_role_roles_code_fk` FOREIGN KEY (`role`) REFERENCES `roles`(`code`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_decided_by_users_id_fk` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_processed_by_users_id_fk` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reservation_guests` ADD CONSTRAINT `reservation_guests_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reservation_guests` ADD CONSTRAINT `reservation_guests_guest_id_guests_id_fk` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reservation_status_history` ADD CONSTRAINT `reservation_status_history_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reservation_status_history` ADD CONSTRAINT `reservation_status_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `restaurant_order_items` ADD CONSTRAINT `restaurant_order_items_order_id_restaurant_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `restaurant_orders`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `restaurant_order_items` ADD CONSTRAINT `restaurant_order_items_menu_item_id_restaurant_menu_items_id_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `restaurant_menu_items`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_code_roles_code_fk` FOREIGN KEY (`role_code`) REFERENCES `roles`(`code`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_code_permissions_code_fk` FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `room_amenities` ADD CONSTRAINT `room_amenities_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `branches_hotel_idx` ON `branches` (`hotel_id`);--> statement-breakpoint
CREATE INDEX `housekeeping_task_history_task_idx` ON `housekeeping_task_history` (`task_id`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_item_idx` ON `inventory_transactions` (`inventory_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_staff_idx` ON `leave_requests` (`staff_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_status_idx` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `refunds_payment_idx` ON `refunds` (`payment_id`);--> statement-breakpoint
CREATE INDEX `reservation_status_history_res_idx` ON `reservation_status_history` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `restaurant_order_items_order_idx` ON `restaurant_order_items` (`order_id`);