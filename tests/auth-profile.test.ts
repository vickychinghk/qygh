import { describe, expect, it } from "vitest";
import { validateProfileInput } from "@/lib/auth-profile";

describe("validateProfileInput", () => {
  it("normalizes a profile update with username and display name", () => {
    expect(
      validateProfileInput({
        username: "  Editor_01 ",
        displayName: "  光滑编辑  ",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }),
    ).toEqual({
      ok: true,
      data: {
        username: "editor_01",
        displayName: "光滑编辑",
        currentPassword: "",
        newPassword: "",
      },
    });
  });

  it("requires the current password when changing password", () => {
    expect(
      validateProfileInput({
        username: "editor",
        displayName: "编辑",
        currentPassword: "",
        newPassword: "12345678",
        confirmPassword: "12345678",
      }),
    ).toEqual({ ok: false, message: "请填写当前密码" });
  });

  it("rejects invalid username, display name, and password changes", () => {
    expect(
      validateProfileInput({
        username: "编辑",
        displayName: "编辑",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }),
    ).toEqual({
      ok: false,
      message: "用户名只能使用 3-24 位字母、数字、下划线或短横线",
    });

    expect(
      validateProfileInput({
        username: "editor",
        displayName: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }),
    ).toEqual({ ok: false, message: "请填写显示名称" });

    expect(
      validateProfileInput({
        username: "editor",
        displayName: "编辑",
        currentPassword: "old-password",
        newPassword: "1234567",
        confirmPassword: "1234567",
      }),
    ).toEqual({ ok: false, message: "新密码至少需要 8 位" });

    expect(
      validateProfileInput({
        username: "editor",
        displayName: "编辑",
        currentPassword: "old-password",
        newPassword: "12345678",
        confirmPassword: "87654321",
      }),
    ).toEqual({ ok: false, message: "两次输入的新密码不一致" });
  });
});
