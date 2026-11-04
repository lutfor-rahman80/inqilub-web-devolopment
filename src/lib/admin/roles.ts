/** Display order of roles: the built-in ones by seniority, then custom roles by name. */
const SYSTEM_ORDER = ["super_admin", "admin", "secretary", "content_editor", "committee_viewer"];

export function sortRoles<T extends { key: string; name_bn: string }>(roles: readonly T[]): T[] {
  const rank = (key: string) => {
    const i = SYSTEM_ORDER.indexOf(key);
    return i === -1 ? SYSTEM_ORDER.length : i;
  };
  return [...roles].sort((a, b) => rank(a.key) - rank(b.key) || a.name_bn.localeCompare(b.name_bn, "bn"));
}
