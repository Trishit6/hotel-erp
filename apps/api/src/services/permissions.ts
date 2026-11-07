import type { StaffRole } from "../constants";
import { STAFF_ROLES } from "../constants";

/**
 * Server-side permission catalogue. The frontend uses the same role names for
 * navigation hints, but these lists are the authoritative enforcement point.
 */
export const PERMISSIONS = {
  // The dashboard summary includes revenue and outstanding balances, so the
  // general `staff` role is deliberately excluded.
  "dashboard:read": ["super-admin", "admin", "manager", "receptionist", "housekeeping", "accountant", "restaurant"],
  "reservations:read": STAFF_ROLES,
  "reservations:write": ["super-admin", "admin", "manager", "receptionist"],
  "reservations:cancel": ["super-admin", "admin", "manager", "receptionist"],
  "reservations:checkin": ["super-admin", "admin", "manager", "receptionist"],
  "reservations:checkout": ["super-admin", "admin", "manager", "receptionist"],
  "rooms:read": STAFF_ROLES,
  "rooms:write": ["super-admin", "admin", "manager"],
  "rooms:status": ["super-admin", "admin", "manager", "housekeeping"],
  "guests:read": ["super-admin", "admin", "manager", "receptionist", "accountant"],
  "guests:write": ["super-admin", "admin", "manager", "receptionist"],
  "payments:read": ["super-admin", "admin", "manager", "accountant", "receptionist"],
  "payments:write": ["super-admin", "admin", "manager", "accountant", "receptionist"],
  "housekeeping:read": STAFF_ROLES,
  "housekeeping:write": ["super-admin", "admin", "manager", "housekeeping"],
  "staff:read": ["super-admin", "admin", "manager"],
  "staff:write": ["super-admin", "admin", "manager"],
  "attendance:read": ["super-admin", "admin", "manager"],
  "attendance:write": ["super-admin", "admin", "manager"],
  "inventory:read": STAFF_ROLES,
  "inventory:write": ["super-admin", "admin", "manager", "housekeeping", "restaurant"],
  "expenses:read": ["super-admin", "admin", "manager", "accountant"],
  "expenses:write": ["super-admin", "admin", "manager", "accountant"],
  "expenses:approve": ["super-admin", "admin", "manager"],
  "restaurant:read": STAFF_ROLES,
  "restaurant:write": ["super-admin", "admin", "manager", "restaurant", "receptionist"],
  "reports:read": ["super-admin", "admin", "manager", "accountant"],
  "activity:read": ["super-admin", "admin", "manager"],
  "users:manage": ["super-admin", "admin"],
  "settings:manage": ["super-admin", "admin"],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly StaffRole[]).includes(role);
}
