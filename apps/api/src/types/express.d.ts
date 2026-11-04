import type { StaffRole } from "../constants";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  staffId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionId?: string;
    }
  }
}

export {};
