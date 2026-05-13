import { EditorApp } from "@/components/editor/editor-app";
import { getDashboardSnapshot } from "@/lib/data";
import { requireCurrentUser } from "@/lib/auth";

export default async function AppPage({
  searchParams,
}: {
  searchParams?: Promise<{ issue?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const snapshot = await getDashboardSnapshot(params?.issue);

  return <EditorApp currentUser={user} snapshot={snapshot} />;
}
