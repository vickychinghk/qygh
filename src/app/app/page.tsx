import { redirect } from "next/navigation";
import { EditorApp } from "@/components/editor/editor-app";
import { getDashboardSnapshot } from "@/lib/data";
import { requireCurrentUser } from "@/lib/auth";

export default async function AppPage() {
  const user = await requireCurrentUser();
  const snapshot = await getDashboardSnapshot();

  if (!snapshot) {
    redirect("/login");
  }

  return <EditorApp currentUser={user} snapshot={snapshot} />;
}
