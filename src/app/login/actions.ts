"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await signIn(username, password);

  if (!result.ok) {
    redirect("/login?error=1");
  }

  redirect("/app");
}
