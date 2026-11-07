import type { UserRole } from "../constants";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
