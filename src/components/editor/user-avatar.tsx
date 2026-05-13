import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const fallback = name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <Avatar className={cn("size-8 border", className)}>
      <AvatarFallback className="text-base leading-none">{fallback}</AvatarFallback>
    </Avatar>
  );
}
