import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { registerAction } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }

  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-5 py-8">
      <section className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-normal">
            MAKE QYGH 迷惑行为 GAG
          </h1>
          <p className="text-sm text-muted-foreground">
            所有账号权限一致，注册后即可进入编辑台。
          </p>
        </div>

        <form action={registerAction} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="输入用户名"
              required
            />
            <p className="text-xs text-muted-foreground">
              3-24 位字母、数字、下划线或短横线
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">显示名称</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              placeholder="你的名字"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="inviteCode">注册口令</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              type="text"
              autoComplete="off"
              placeholder="输入注册口令"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="至少 8 位"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="再输入一次"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            注册并进入
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          已有账号？
          <Link href="/login" className="font-medium text-primary">
            去登录
          </Link>
        </p>
      </section>
    </main>
  );
}
