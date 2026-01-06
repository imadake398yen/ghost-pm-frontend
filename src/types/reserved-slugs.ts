/**
 * チームslugとして使用できない予約語
 * フロントエンドのルーティングと衝突を避けるため
 */
export const RESERVED_TEAM_SLUGS = [
  // アプリケーションルート
  "dashboard",
  "settings",
  "login",
  "signup",
  "logout",
  "register",
  "auth",
  "callback",

  // リソースルート
  "teams",
  "projects",
  "tasks",

  // API・システム
  "api",
  "graphql",
  "health",
  "public",
  "static",
  "assets",
  "_next",

  // 一般的な予約語
  "admin",
  "administrator",
  "root",
  "system",
  "null",
  "undefined",
  "new",
  "create",
  "edit",
  "delete",
  "search",
  "explore",
  "help",
  "about",
  "pricing",
  "terms",
  "privacy",
  "contact",
  "support",
  "status",
  "docs",
  "documentation",
  "blog",
  "news",

  // ユーザー関連
  "me",
  "my",
  "profile",
  "account",
  "user",
  "users",

  // 組織関連
  "org",
  "orgs",
  "organization",
  "organizations",
  "enterprise",

  // GhostPM固有
  "ghost",
  "ai",
  "claude",
  "mcp",
] as const;

export type ReservedTeamSlug = (typeof RESERVED_TEAM_SLUGS)[number];

/**
 * 指定されたslugが予約語かどうかを判定する
 */
export function isReservedTeamSlug(slug: string): boolean {
  return RESERVED_TEAM_SLUGS.includes(slug.toLowerCase() as ReservedTeamSlug);
}
