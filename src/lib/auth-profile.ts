export type ProfileInput = {
  username: string;
  displayName: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ProfileValidationResult =
  | {
      ok: true;
      data: {
        username: string;
        displayName: string;
        currentPassword: string;
        newPassword: string;
      };
    }
  | { ok: false; message: string };

const usernamePattern = /^[a-z0-9_-]{3,24}$/;

export function validateProfileInput(input: ProfileInput): ProfileValidationResult {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;
  const changingPassword = Boolean(newPassword || confirmPassword);

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

  if (changingPassword && !currentPassword) {
    return { ok: false, message: "请填写当前密码" };
  }

  if (changingPassword && newPassword.length < 8) {
    return { ok: false, message: "新密码至少需要 8 位" };
  }

  if (changingPassword && newPassword !== confirmPassword) {
    return { ok: false, message: "两次输入的新密码不一致" };
  }

  return {
    ok: true,
    data: {
      username,
      displayName,
      currentPassword,
      newPassword: changingPassword ? newPassword : "",
    },
  };
}
