import { redirect } from "next/navigation";
import Link from "next/link";
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
          <h1 className="text-xl font-semibold tracking-normal">
            MAKE QYGH 迷惑行为 GAG
          </h1>
          <p className="text-sm text-muted-foreground">
            登录编辑台，整理投稿、吐槽语和推送刊数。
          </p>
        </div>

        <form action={loginAction} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="输入用户名"
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
              placeholder="输入密码"
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

        <p className="mt-5 text-center text-sm text-muted-foreground">
          还没有账号？
          <Link href="/register" className="font-medium text-primary">
            去注册
          </Link>
        </p>
      </section>
    </main>
  );
}
