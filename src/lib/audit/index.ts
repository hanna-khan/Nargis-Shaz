import type { AuditLogEntry, PermissionResource, StaffMember } from "@/types";

/**
 * Builds an audit entry. Phase 1: appended to admin client state.
 * Phase 2: written server-side in the same transaction as the mutation
 * (`audit_log` table, insert-only RLS: no update/delete for any role).
 */
export function auditEntry(args: {
  actor: Pick<StaffMember, "id" | "name">;
  action: string;
  resource: PermissionResource;
  resourceId?: string;
  summary: string;
  changes?: AuditLogEntry["changes"];
  at: string;
  seq: number;
}): AuditLogEntry {
  return {
    id: `aud_local_${args.seq}`,
    at: args.at,
    actorId: args.actor.id,
    actorName: args.actor.name,
    action: args.action,
    resource: args.resource,
    resourceId: args.resourceId,
    summary: args.summary,
    changes: args.changes,
  };
}

export function diff<T extends object>(before: T, after: T, keys: (keyof T)[]) {
  const out: NonNullable<AuditLogEntry["changes"]> = {};
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[String(k)] = { from: before[k], to: after[k] };
  }
  return Object.keys(out).length ? out : undefined;
}
