import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-5 py-8">
      <section className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-normal">迷惑行为编辑台</h1>
          <p className="text-sm text-muted-foreground">
            编辑账号登录，本地测试密码为 123456。
          </p>
        </div>

        <form action={loginAction} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="vicky"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="123456"
              required
            />
          </div>
          {params.error ? (
            <p className="text-sm text-destructive">用户名或密码不正确</p>
          ) : null}
          <Button type="submit" className="w-full">
            登录
          </Button>
        </form>
      </section>
    </main>
  );
}
