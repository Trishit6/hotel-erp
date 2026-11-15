import { describe, expect, it } from "vitest";
import { assertDemoSeedAllowed } from "../src/database/seedPolicy";

describe("demo seed policy", () => {
  it("allows the demo seed outside production", () => {
    expect(() => assertDemoSeedAllowed(false)).not.toThrow();
  });

  it("refuses the demo seed in production before touching the database", () => {
    expect(() => assertDemoSeedAllowed(true)).toThrow(/Refusing to run the demo seed with NODE_ENV=production/);
  });

  it("names the data that would be lost so the refusal is actionable", () => {
    expect(() => assertDemoSeedAllowed(true)).toThrow(/deletes users, sessions and business records/);
  });
});
