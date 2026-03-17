import { describe, expect, it } from "vitest";
import { credentialsSchema, validatePostMediaSelection } from "./validation";

describe("credentialsSchema", () => {
  it("rejects weak password", async () => {
    await expect(
      credentialsSchema.validate({ username: "user", password: "abc" })
    ).rejects.toBeTruthy();
  });

  it("accepts strong password", async () => {
    await expect(
      credentialsSchema.validate({ username: "user", password: "Strong@123" })
    ).resolves.toBeTruthy();
  });
});

describe("validatePostMediaSelection", () => {
  it("requires exactly one file", () => {
    const result = validatePostMediaSelection([]);
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported mime type", () => {
    const result = validatePostMediaSelection([{ type: "application/pdf", size: 1000 }]);
    expect(result.valid).toBe(false);
  });

  it("accepts valid media", () => {
    const result = validatePostMediaSelection([{ type: "image/png", size: 1024 }]);
    expect(result.valid).toBe(true);
  });
});
