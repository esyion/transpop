import type { ViewRoute } from "@/types/translation";

/** 把任意 pathname 归一化为应用内的视图路由。 */
export function toViewRoute(pathname: string | null): ViewRoute {
  if (pathname === "/settings" || pathname === "/history") return pathname;
  return "/";
}
