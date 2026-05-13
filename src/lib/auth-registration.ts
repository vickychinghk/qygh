export type RegistrationInput = {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
};

export type RegistrationValidationResult =
  | {
      ok: true;
      data: {
        username: string;
        displayName: string;
        password: string;
      };
    }
  | { ok: false; message: string };

const usernamePattern = /^[a-z0-9_-]{3,24}$/;

export function validateRegistrationInput(
  input: RegistrationInput,
): RegistrationValidationResult {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const password = input.password;
  const confirmPassword = input.confirmPassword;
  const inviteCode = input.inviteCode.trim();

  if (!usernamePattern.test(username)) {
    return {
      ok: false,
      message: "用户名只能使用 3-24 位字母、数字、下划线或短横线",
    };
  }

  if (!displayName) {
    return { ok: false, message: "请填写显示名称" };
  }

  if (displayName.length > 24) {
    return { ok: false, message: "显示名称不能超过 24 个字符" };
  }

  if (password.length < 8) {
    return { ok: false, message: "密码至少需要 8 位" };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: "两次输入的密码不一致" };
  }

  const allowedInviteCodes = getAllowedInviteCodes();
  if (allowedInviteCodes.length === 0) {
    return { ok: false, message: "注册口令尚未配置" };
  }

  if (!allowedInviteCodes.includes(inviteCode)) {
    return { ok: false, message: "注册口令不正确" };
  }

  return { ok: true, data: { username, displayName, password } };
}

function getAllowedInviteCodes() {
  const configured = process.env.REGISTRATION_INVITE_CODE;

  if (configured) {
    return configured
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return ["我爱vv"];
}
