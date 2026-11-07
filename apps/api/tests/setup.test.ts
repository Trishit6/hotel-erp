import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { users } from "../src/database/schema";
import { createUser } from "../src/services/users";
import { verifyPassword } from "../src/services/password";
import { resetTestDatabase } from "./helpers";

const app = createApp();

describe("initial super admin bootstrap and account safety", () => {
  const email = "first-super-admin@test.local";
  const password = "Bootstrap@12345";

  beforeAll(async () => {
    await resetTestDatabase();
  });

  it("does not expose a public bootstrap endpoint", async () => {
    const setup = await request(app).post("/api/auth/setup").send({
      name: "Intruder",
      email: "intruder@test.local",
      password: "Intruder@12345",
      setupToken: "anything",
    });
    expect(setup.status).toBe(404);

    const status = await request(app).get("/api/auth/setup-status");
    expect(status.status).toBe(404);
  });

  it("creates the first super admin with an Argon2id hash", async () => {
    const created = await createUser({
      name: "First Administrator",
      email,
      password,
      role: "super-admin",
    });
    expect(created.role).toBe("super-admin");

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row.passwordHash).not.toContain(password);
    expect(await verifyPassword(row.passwordHash, password)).toBe(true);

    const login = await request(app).post("/api/auth/login").send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.redirect).toBe("/admin/dashboard");
  });

  it("refuses to demote the last active super administrator", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email, password });

    const list = await agent.get("/api/admin/users");
    expect(list.status).toBe(200);
    const self = list.body.users.find((user: { email: string }) => user.email === email);
    expect(self).toBeDefined();

    const demote = await agent.patch(`/api/admin/users/${self.id}`).send({ role: "manager" });
    expect(demote.status).toBe(409);
    expect(String(demote.body.error.message)).toMatch(/super administrator/i);
  });
});
