ALTER TABLE `reservations` ADD `hold_expires_at` datetime;--> statement-breakpoint
CREATE INDEX `reservations_hold_idx` ON `reservations` (`status`,`hold_expires_at`);