import { rateLimit } from "express-rate-limit";

const jsonMessage = (message: string) => ({ error: { code: "rate_limited", message } });

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: jsonMessage("Too many requests. Please try again shortly."),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: jsonMessage("Too many authentication attempts. Please try again later."),
});

export const bookingWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: jsonMessage("Too many booking requests. Please try again later."),
});

// Reservation verification combines a reference with a contact secret. Count
// every attempt, including successful ones, so the endpoint cannot be used for
// sustained reference enumeration.
export const publicLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: jsonMessage("Too many booking lookup attempts. Please try again later."),
});
