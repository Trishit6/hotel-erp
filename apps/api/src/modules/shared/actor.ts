import type { Request } from "express";
import type { Actor } from "../../services/reservations";
import { unauthorized } from "../../utils/http";

export function actorFrom(req: Request): Actor {
  if (!req.user) throw unauthorized();
  return { id: req.user.id, name: req.user.name, role: req.user.role };
}
