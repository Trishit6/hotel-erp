import { describe, expect, it } from "vitest";
import { DEFAULT_TEST_DATABASE, resolveTestDatabaseName } from "./database-guard";

describe("integration test database guard", () => {
  it("falls back to the documented test database when DB_TEST_NAME is unset", () => {
    expect(resolveTestDatabaseName({})).toBe(DEFAULT_TEST_DATABASE);
    expect(resolveTestDatabaseName({ dbTestName: "   " })).toBe(DEFAULT_TEST_DATABASE);
  });

  it("accepts names with an explicit test segment", () => {
    expect(resolveTestDatabaseName({ dbTestName: "rivr_hotel_test" })).toBe("rivr_hotel_test");
    expect(resolveTestDatabaseName({ dbTestName: "test_rivr" })).toBe("test_rivr");
    expect(resolveTestDatabaseName({ dbTestName: "rivr-test" })).toBe("rivr-test");
  });

  it("rejects a database name that does not identify itself as a test database", () => {
    for (const name of ["rivr_hotel", "rivr_ci", "hospitality", "rivr_latest"]) {
      expect(() => resolveTestDatabaseName({ dbTestName: name })).toThrow(/must contain a "test" segment/);
    }
  });

  it("rejects DB_TEST_NAME that collapses onto DB_NAME", () => {
    expect(() =>
      resolveTestDatabaseName({ dbTestName: "rivr_hotel_test", configuredDatabase: "RIVR_HOTEL_TEST" }),
    ).toThrow(/must be separate/);
  });

  it("does not mask the failure behind the name check", () => {
    expect(() =>
      resolveTestDatabaseName({ dbTestName: "rivr_hotel", configuredDatabase: "rivr_hotel" }),
    ).toThrow(/must contain a "test" segment/);
  });
});
