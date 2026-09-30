import { assertEquals } from "@std/assert";

/**
 * Asserts that `fn` rejects with an `HttpException`-style `code`.
 * (`@std/assert`'s `assertRejects` only accepts an Error class or a message
 * substring, not a predicate.)
 */
export const assertRejectsWithCode = async (
  fn: () => Promise<unknown>,
  code: number,
): Promise<void> => {
  try {
    await fn();
  } catch (error) {
    assertEquals((error as { code?: number }).code, code);
    return;
  }
  throw new Error(`expected the call to reject with code ${code}`);
};
