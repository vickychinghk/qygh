import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRegistrationInput } from "@/lib/auth-registration";

describe("validateRegistrationInput", () => {
  afterEach(() => {
    delete process.env.REGISTRATION_INVITE_CODE;
    vi.unstubAllEnvs();
  });

  it("normalizes a valid registration payload", () => {
    process.env.REGISTRATION_INVITE_CODE = "我爱vv";

    const result = validateRegistrationInput({
      username: "  Vicky_2026  ",
      displayName: "  Vicky  ",
      password: "12345678",
      confirmPassword: "12345678",
      inviteCode: "我爱vv",
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
    process.env.REGISTRATION_INVITE_CODE = "我爱vv";

    expect(
      validateRegistrationInput({
        username: "清华",
        displayName: "",
        password: "123",
        confirmPassword: "456",
        inviteCode: "我爱vv",
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
        inviteCode: "我爱vv",
      }),
    ).toEqual({ ok: false, message: "请填写显示名称" });

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "编辑",
        password: "1234567",
        confirmPassword: "1234567",
        inviteCode: "我爱vv",
      }),
    ).toEqual({ ok: false, message: "密码至少需要 8 位" });

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "编辑",
        password: "12345678",
        confirmPassword: "87654321",
        inviteCode: "我爱vv",
      }),
    ).toEqual({ ok: false, message: "两次输入的密码不一致" });
  });

  it("requires a configured registration invite code", () => {
    process.env.REGISTRATION_INVITE_CODE = "我爱vv";

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "编辑",
        password: "12345678",
        confirmPassword: "12345678",
        inviteCode: "不对",
      }),
    ).toEqual({ ok: false, message: "注册口令不正确" });
  });

  it("fails closed in production when the invite code is missing", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(
      validateRegistrationInput({
        username: "editor",
        displayName: "编辑",
        password: "12345678",
        confirmPassword: "12345678",
        inviteCode: "任何口令",
      }),
    ).toEqual({ ok: false, message: "注册口令尚未配置" });
  });
});
