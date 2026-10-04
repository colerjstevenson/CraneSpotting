import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type AppLinkProps = {
  children: ReactNode;
  variant?: "primary" | "quiet";
} & Omit<ComponentProps<typeof Link>, "className">;

export function AppLink({ children, variant = "quiet", ...props }: AppLinkProps) {
  return <Link className={`app-link app-link--${variant}`} {...props}>{children}</Link>;
}