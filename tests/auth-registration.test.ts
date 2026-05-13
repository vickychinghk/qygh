import { describe, expect, it } from "vitest";
import { validateRegistrationInput } from "@/lib/auth-registration";

describe("validateRegistrationInput", () => {
  it("normalizes a valid registration payload", () => {
    const result = validateRegistrationInput({
      username: "  Vicky_2026  ",
      displayName: "  Vicky  ",
      password: "12345678",
      confirmPassword: "12345678",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        username: "vicky_2026",
        displayName: "Vicky",
        password: "12345678",
      },
    });
  });

  it("rejects duplicate-looking, short, or mismatched input before creating a user", () => {
    expect(
      validateRegistrationInput({
        username: "清华",
        displayName: "",
        password: "123",
        confirmPassword: "456",
      }),
    ).toEqual({
      ok: false,
      message: "用户名只能使用 3-24 位字母、数字、下划线或短横线",
    });

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "",
        password: "12345678",
        confirmPassword: "12345678",
      }),
    ).toEqual({ ok: false, message: "请填写显示名称" });

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "编辑",
        password: "1234567",
        confirmPassword: "1234567",
      }),
    ).toEqual({ ok: false, message: "密码至少需要 8 位" });

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "编辑",
        password: "12345678",
        confirmPassword: "87654321",
      }),
    ).toEqual({ ok: false, message: "两次输入的密码不一致" });
  });
});
