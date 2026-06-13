export const legacyCurrentUserId = "current_user";

export function isCurrentUserResource(
  resourceUserId: string,
  currentUserId: string
): boolean {
  return resourceUserId === currentUserId || resourceUserId === legacyCurrentUserId;
}
