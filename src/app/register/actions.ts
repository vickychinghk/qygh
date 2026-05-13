"use server";

import { redirect } from "next/navigation";
import { register } from "@/lib/auth";

export async function registerAction(formData: FormData) {
  const result = await register({
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!result.ok) {
    redirect(`/register?error=${encodeURIComponent(result.message)}`);
  }

  redirect("/app");
}
