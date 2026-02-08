export function isAllowedUser(userId: string | null | undefined) {
  if (!userId) return false;
  const allowed = (process.env.ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return allowed.includes(userId.trim());
}
