import { db, type Executor } from "./db";
import { auditLogs } from "./db/schema";
import { newId } from "./lib/core";
import { requestMeta } from "./lib/request";

export interface Actor { type: "staff" | "customer" | "system" | "anonymous"; id: string | null; label: string }

export const SYSTEM: Actor = { type: "system", id: null, label: "System" };

export async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  changes?: Record<string, { from: unknown; to: unknown }> | null,
  exec: Executor = db,
) {
  const meta = await requestMeta();
  await exec.insert(auditLogs).values({
    id: newId("aud"), actorType: actor.type, actorId: actor.id, actorLabel: actor.label.slice(0, 160), action, entityType, entityId,
    summary: summary.slice(0, 500), changes: changes && Object.keys(changes).length ? changes : null, ip: meta.ip, userAgent: meta.userAgent,
  });
}

/** Field-level diff for audit entries. Secrets must never be passed in. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>, keys: (keyof T)[]) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of keys) {
    if (!(k in after)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k as string] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return out;
}
