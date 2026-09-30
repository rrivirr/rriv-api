/**
 * Detects a database unique-constraint violation.
 *
 * Prisma maps known violations to `P2002`; with the `@prisma/adapter-pg` driver
 * adapter the underlying Postgres code (`23505`) can also surface. Used to turn
 * the partial-unique-index backstops (see the
 * `20260929120000_active_uniqueness_backstops` migration) into `409`s.
 */
export const isUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return code === "P2002" || code === "23505";
};
