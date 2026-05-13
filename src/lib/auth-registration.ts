export type RegistrationInput = {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
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

  return { ok: true, data: { username, displayName, password } };
}
