import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects email without domain", () => {
    const result = loginSchema.safeParse({
      email: "user@",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password exactly 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "12345678" }).success).toBe(false);
  });

  it("rejects non-string types", () => {
    const result = loginSchema.safeParse({
      email: 123,
      password: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts long password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("accepts valid name, email, and password", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({
      name: "J",
      email: "john@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 2 characters", () => {
    const result = registerSchema.safeParse({
      name: "Jo",
      email: "john@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "john@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = registerSchema.safeParse({
      email: "john@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("inherits email validation from loginSchema", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "invalid",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("inherits password validation from loginSchema", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("strips unknown fields", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "12345678",
      extra: "field",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("extra");
    }
  });
});
