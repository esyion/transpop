/** 路由常量与归一化工具。 */

/** 视图对应的路由路径。 */
export type ViewRoute = "/" | "/settings" | "/history";

/**
 * 把任意 pathname 归一化为应用内的视图路由。
 * 未知路径（含 null）回退到翻译页。
 */
export function toViewRoute(pathname: string | null): ViewRoute {
  if (pathname === "/settings" || pathname === "/history") return pathname;
  return "/";
}
