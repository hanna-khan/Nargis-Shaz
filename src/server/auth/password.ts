import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id (OWASP 2025 baseline: m=19 MiB, t=2, p=1). @node-rs/argon2 ships prebuilt binaries
 * for linux-x64 (Hostinger) plus a WASM fallback, so no compiler is needed on the server.
 */
const OPTIONS = { algorithm: 2 /* Argon2id */, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => hash(plain, OPTIONS);

export async function verifyPassword(stored: string | null | undefined, plain: string): Promise<boolean> {
  if (!stored) {
    // Spend comparable time so the response doesn't reveal whether the account exists.
    await hash(plain, OPTIONS);
    return false;
  }
  try {
    return await verify(stored, plain);
  } catch {
    return false;
  }
}

/** Server-side password policy (shown to users in the form hints). */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 128) return "Use 128 characters or fewer.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9\W_]/.test(pw)) return "Use a mix of letters and numbers or symbols.";
  if (email && pw.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "Don't include your email name in the password.";
  return null;
}
