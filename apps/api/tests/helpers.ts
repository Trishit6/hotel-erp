import type TestAgent from "supertest/lib/agent";
import { db } from "../src/database/client";
import { roomTypes, rooms } from "../src/database/schema";
import { ensureDatabaseExists } from "../src/database/ensure";
import { dropAllTables } from "../src/database/reset";
import { migrate } from "../src/database/migrate";
import { seedRolesOnly } from "../src/database/seed";
import { createUser } from "../src/services/users";

export async function resetTestDatabase(): Promise<void> {
  await ensureDatabaseExists();
  await dropAllTables();
  await migrate();
  await seedRolesOnly();
}

export async function seedTestCatalog(): Promise<void> {
  const now = new Date();
  await db.insert(roomTypes).values({
    id: "type-test",
    name: "Test King",
    description: "A room type used by the integration suite.",
    capacity: 2,
    size: 30,
    rate: "2500.00",
    image: "",
    updatedAt: now,
  });
  await db.insert(rooms).values([
    {
      id: "room-test",
      number: "T1",
      typeId: "type-test",
      floor: 1,
      status: "available",
      notes: "Test room one",
      updatedAt: now,
    },
    {
      id: "room-test-2",
      number: "T2",
      typeId: "type-test",
      floor: 1,
      status: "available",
      notes: "Test room two",
      updatedAt: now,
    },
  ]);
}

/**
 * Bootstrap the first super administrator the way production does: create the
 * account through the service, then sign in through the unified login route.
 */
export async function setupAdmin(agent: TestAgent): Promise<{ email: string; password: string }> {
  const email = "admin@test.local";
  const password = "Admin@12345678";
  await createUser({ name: "Test Administrator", email, password, role: "super-admin" });
  const response = await agent.post("/api/auth/login").send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Admin login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { email, password };
}
