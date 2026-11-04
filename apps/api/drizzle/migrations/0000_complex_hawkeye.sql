CREATE TABLE `activity_logs` (
	`id` varchar(64) NOT NULL,
	`actor` varchar(120) NOT NULL,
	`action` varchar(160) NOT NULL,
	`detail` varchar(500) NOT NULL DEFAULT '',
	`tone` enum('info','success','warning','danger') NOT NULL DEFAULT 'info',
	`user_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` varchar(64) NOT NULL,
	`staff_id` varchar(64) NOT NULL,
	`date` date NOT NULL,
	`status` enum('present','absent','late','leave') NOT NULL DEFAULT 'present',
	`clock_in` varchar(8),
	`clock_out` varchar(8),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_staff_date_unique` UNIQUE(`staff_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` varchar(64) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` varchar(300) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`method` enum('cash','upi','card','bank-transfer','online') NOT NULL,
	`date` date NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`submitted_by` varchar(64),
	`approved_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`address` varchar(300) NOT NULL DEFAULT '',
	`city` varchar(80) NOT NULL DEFAULT '',
	`state` varchar(80) NOT NULL DEFAULT '',
	`postal_code` varchar(10) NOT NULL DEFAULT '',
	`id_type` varchar(40) NOT NULL DEFAULT 'Pending',
	`id_last_four` varchar(4) NOT NULL DEFAULT '',
	`preferences` varchar(500) NOT NULL DEFAULT '',
	`total_stays` int NOT NULL DEFAULT 0,
	`total_spent` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `guests_id` PRIMARY KEY(`id`),
	CONSTRAINT `guests_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `housekeeping_tasks` (
	`id` varchar(64) NOT NULL,
	`room_id` varchar(64) NOT NULL,
	`assigned_to` varchar(64),
	`status` enum('dirty','assigned','in-progress','cleaned','inspected') NOT NULL DEFAULT 'dirty',
	`priority` enum('low','normal','high') NOT NULL DEFAULT 'normal',
	`issue` varchar(300) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `housekeeping_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(80) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`unit` varchar(24) NOT NULL DEFAULT 'unit',
	`minimum_stock` int NOT NULL DEFAULT 0,
	`supplier` varchar(120) NOT NULL DEFAULT '',
	`purchase_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(64) NOT NULL,
	`number` varchar(32) NOT NULL,
	`reservation_id` varchar(64) NOT NULL,
	`status` enum('pending','partial','paid','refunded') NOT NULL DEFAULT 'pending',
	`issued_at` datetime NOT NULL,
	`due_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(64) NOT NULL,
	`reservation_id` varchar(64) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`method` enum('cash','upi','card','bank-transfer','online') NOT NULL,
	`status` enum('completed','refunded') NOT NULL DEFAULT 'completed',
	`paid_at` datetime NOT NULL,
	`note` varchar(300) NOT NULL DEFAULT '',
	`recorded_by` varchar(64),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` varchar(64) NOT NULL,
	`reference` varchar(24) NOT NULL,
	`guest_id` varchar(64) NOT NULL,
	`room_id` varchar(64) NOT NULL,
	`check_in` date NOT NULL,
	`check_out` date NOT NULL,
	`adults` int NOT NULL DEFAULT 1,
	`children` int NOT NULL DEFAULT 0,
	`status` enum('pending','confirmed','checked-in','checked-out','cancelled','no-show') NOT NULL DEFAULT 'confirmed',
	`payment_status` enum('pending','partial','paid','refunded') NOT NULL DEFAULT 'pending',
	`room_charges` decimal(12,2) NOT NULL DEFAULT '0.00',
	`additional_charges` decimal(12,2) NOT NULL DEFAULT '0.00',
	`discount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`tax` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total` decimal(12,2) NOT NULL DEFAULT '0.00',
	`paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`special_requests` varchar(500) NOT NULL DEFAULT '',
	`checked_in_at` datetime,
	`checked_out_at` datetime,
	`cancelled_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `reservations_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_orders` (
	`id` varchar(64) NOT NULL,
	`guest_name` varchar(120) NOT NULL,
	`room_number` varchar(20) NOT NULL DEFAULT '',
	`reservation_id` varchar(64),
	`items` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`status` enum('new','preparing','served','cancelled') NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `restaurant_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`code` varchar(32) NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	CONSTRAINT `roles_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `room_type_amenities` (
	`id` varchar(64) NOT NULL,
	`room_type_id` varchar(64) NOT NULL,
	`amenity` varchar(120) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `room_type_amenities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_types` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`capacity` int NOT NULL,
	`size` int NOT NULL,
	`rate` decimal(12,2) NOT NULL,
	`image` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `room_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` varchar(64) NOT NULL,
	`number` varchar(20) NOT NULL,
	`type_id` varchar(64) NOT NULL,
	`floor` int NOT NULL,
	`status` enum('available','occupied','reserved','cleaning','maintenance','out-of-order') NOT NULL DEFAULT 'available',
	`notes` varchar(500) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	`ip` varchar(64) NOT NULL DEFAULT '',
	`user_agent` varchar(255) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`department` enum('Reception','Housekeeping','Restaurant','Maintenance','Security','Management','Finance') NOT NULL,
	`role` varchar(32) NOT NULL,
	`shift` varchar(64) NOT NULL DEFAULT 'General',
	`status` enum('active','on-leave','inactive') NOT NULL DEFAULT 'active',
	`joined_at` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(32) NOT NULL,
	`staff_id` varchar(64),
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `housekeeping_tasks` ADD CONSTRAINT `housekeeping_tasks_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `housekeeping_tasks` ADD CONSTRAINT `housekeeping_tasks_assigned_to_staff_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `staff`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_recorded_by_users_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_guest_id_guests_id_fk` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `restaurant_orders` ADD CONSTRAINT `restaurant_orders_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `room_type_amenities` ADD CONSTRAINT `room_type_amenities_room_type_id_room_types_id_fk` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_type_id_room_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `room_types`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_role_roles_code_fk` FOREIGN KEY (`role`) REFERENCES `roles`(`code`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_roles_code_fk` FOREIGN KEY (`role`) REFERENCES `roles`(`code`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `activity_logs_created_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `expenses_status_idx` ON `expenses` (`status`);--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `guests_name_idx` ON `guests` (`name`);--> statement-breakpoint
CREATE INDEX `guests_phone_idx` ON `guests` (`phone`);--> statement-breakpoint
CREATE INDEX `housekeeping_room_idx` ON `housekeeping_tasks` (`room_id`);--> statement-breakpoint
CREATE INDEX `housekeeping_status_idx` ON `housekeeping_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `housekeeping_assigned_idx` ON `housekeeping_tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `inventory_category_idx` ON `inventory` (`category`);--> statement-breakpoint
CREATE INDEX `invoices_reservation_idx` ON `invoices` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `payments_reservation_idx` ON `payments` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `payments_paid_at_idx` ON `payments` (`paid_at`);--> statement-breakpoint
CREATE INDEX `reservations_room_dates_idx` ON `reservations` (`room_id`,`check_in`,`check_out`);--> statement-breakpoint
CREATE INDEX `reservations_status_idx` ON `reservations` (`status`);--> statement-breakpoint
CREATE INDEX `reservations_guest_idx` ON `reservations` (`guest_id`);--> statement-breakpoint
CREATE INDEX `reservations_created_idx` ON `reservations` (`created_at`);--> statement-breakpoint
CREATE INDEX `restaurant_orders_status_idx` ON `restaurant_orders` (`status`);--> statement-breakpoint
CREATE INDEX `restaurant_orders_created_idx` ON `restaurant_orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `room_type_amenities_type_idx` ON `room_type_amenities` (`room_type_id`);--> statement-breakpoint
CREATE INDEX `rooms_type_idx` ON `rooms` (`type_id`);--> statement-breakpoint
CREATE INDEX `rooms_status_idx` ON `rooms` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `staff_department_idx` ON `staff` (`department`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_staff_idx` ON `users` (`staff_id`);