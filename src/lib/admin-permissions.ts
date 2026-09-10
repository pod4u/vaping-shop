export const ADMIN_ROLES = [
  "owner",
  "manager",
  "order_staff",
  "support",
  "stock_staff",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "dashboard.view",
  "analytics.view",
  "orders.view",
  "orders.create",
  "orders.reserve",
  "orders.confirm",
  "orders.cancel",
  "orders.ship",
  "customers.view",
  "customers.manage",
  "customers.link_line",
  "stock.view",
  "stock.manage",
  "settings.view",
  "reviews.moderate",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS,
  manager: ADMIN_PERMISSIONS,
  order_staff: [
    "dashboard.view",
    "orders.view",
    "orders.create",
    "orders.reserve",
    "orders.confirm",
    "orders.cancel",
    "orders.ship",
    "customers.view",
    "stock.view",
    "reviews.moderate",
  ],
  support: [
    "dashboard.view",
    "orders.view",
    "orders.create",
    "customers.view",
    "customers.manage",
    "customers.link_line",
    "reviews.moderate",
  ],
  stock_staff: ["dashboard.view", "orders.view", "stock.view", "stock.manage"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function permissionsForRole(role: AdminRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
