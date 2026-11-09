import request from "supertest";
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
export interface CustomerFixture {
  agent: TestAgent;
  user: { id: string; name: string; email: string; role: string };
  name: string;
  email: string;
  phone: string;
  password: string;
}

let customerSequence = 0;

/**
 * Register a real customer through the public signup route and return its
 * session agent. Tests use this instead of creating reservations anonymously,
 * because customer-facing booking now requires that session.
 */
export async function registerCustomerAgent(
  app: Parameters<typeof request>[0],
  options: { name?: string; email?: string; phone?: string; password?: string } = {},
): Promise<CustomerFixture> {
  customerSequence += 1;
  const name = options.name ?? `Test Customer ${customerSequence}`;
  const email = options.email?.trim().toLowerCase() ?? `customer.${customerSequence}@test.local`;
  const phone = options.phone ?? `98765${String(10_000 + customerSequence).slice(-5)}`;
  const password = options.password ?? "Customer@123456";
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({ name, email, phone, password });
  if (response.status !== 201) {
    throw new Error(`Customer registration failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { agent, user: response.body.user, name, email, phone, password };
}

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
