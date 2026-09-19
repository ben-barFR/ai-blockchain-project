export type UserType = "issuer" | "owner" | "admin";

export function isUserType(value: string | null | undefined): value is UserType {
  return value === "issuer" || value === "owner" || value === "admin";
}

export function portalForUserType(userType: string | null | undefined) {
  if (userType === "admin") return "/admin";
  if (userType === "issuer") return "/issuer";
  return "/owner";
}

export function labelForUserType(userType: string | null | undefined) {
  if (userType === "admin") return "Admin";
  if (userType === "issuer") return "Certificate issuer";
  return "Building owner";
}
