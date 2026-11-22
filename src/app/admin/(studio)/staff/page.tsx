import Link from "next/link";
import { asc } from "drizzle-orm";
import { ActionButton, AdminForm, Check, Disclosure, Field, TextareaField } from "@/components/admin/client";
import { Card, fmtDateTime, NoAccess, PageHeader, Status, Table } from "@/components/admin/ui";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { PERMISSION_CATALOGUE, type Resource } from "@/server/auth/permissions";
import { staffCan, staffPage } from "@/server/admin/guard";
import { inviteStaffAction, saveRoleAction, updateStaffAction } from "../../_actions/ops";

export const metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  const { staff: me, allowed } = await staffPage("staff.view");
  if (!allowed) return <NoAccess permission="staff.view" />;
  const [members, roles, assignments, rolePerms] = await Promise.all([
    db.select().from(s.staffUsers).orderBy(asc(s.staffUsers.name)),
    db.select().from(s.roles).orderBy(asc(s.roles.name)),
    db.select().from(s.staffRoleAssignments),
    db.select().from(s.rolePermissions),
  ]);
  const can = staffCan(me, "staff.manage");
  const rolesOf = (id: string) => assignments.filter((a) => a.staffUserId === id).map((a) => a.roleId);
  return (
    <>
      <PageHeader title="Staff & roles" description="Every Studio action is checked on the server against the staff member's roles. Changes take effect on their next request." />
      {can && (
        <Card title="Invite a staff member" className="mb-6">
          <AdminForm action={inviteStaffAction} submit="Send invitation" resetOnSuccess className="md:grid-cols-2">
            <Field label="Full name" name="name" required />
            <Field label="Work email" name="email" type="email" required />
            <fieldset className="md:col-span-2"><legend className="mb-2 text-[11.5px] text-charcoal/65">Roles</legend><div className="flex flex-wrap gap-x-5 gap-y-2">{roles.filter((r) => r.key !== "super_admin" || me.isSuperAdmin).map((r) => <Check key={r.id} name="roleIds" value={r.id} label={r.name} hint={r.description} />)}</div></fieldset>
          </AdminForm>
        </Card>
      )}
      <Table head={["Member", "Roles", "Status", "Last sign-in", ""]} className="mb-10">
        {members.map((m) => (
          <tr key={m.id}>
            <td><span className="font-medium">{m.name}</span>{m.id === me.id && <span className="ml-2 text-[11px] text-charcoal/50">(you)</span>}<span className="block text-[11.5px] text-charcoal/55">{m.email}</span></td>
            <td className="text-[12.5px]">{m.isSuperAdmin ? "Super Admin" : rolesOf(m.id).map((id) => roles.find((r) => r.id === id)?.name).join(", ") || "—"}</td>
            <td><Status value={m.status} />{m.lockedUntil && m.lockedUntil > new Date() && <span className="block text-[11px] text-danger">Locked</span>}</td>
            <td>{fmtDateTime(m.lastLoginAt)}</td>
            <td className="min-w-[260px]">
              <div className="flex flex-wrap gap-1">
                {staffCan(me, "audit.view") && <Link href={`/admin/audit-log?actor=${m.id}`} className="px-2.5 py-1.5 text-[12.5px] underline">Activity</Link>}
                {can && m.id !== me.id && <ActionButton action={updateStaffAction} fields={{ id: m.id, op: m.status === "deactivated" ? "activate" : "deactivate" }} label={m.status === "deactivated" ? "Activate" : "Deactivate"} variant="ghost" confirm={m.status === "deactivated" ? undefined : `Deactivate ${m.name}? They are signed out immediately.`} />}
                {can && <ActionButton action={updateStaffAction} fields={{ id: m.id, op: "reset" }} label="Reset access" variant="ghost" confirm={`Sign ${m.name} out everywhere and send a new password link?`} />}
                {can && <Disclosure label="Roles" variant="ghost">
                  <AdminForm action={updateStaffAction} submit="Save roles">
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="op" value="roles" />
                    {roles.filter((r) => r.key !== "super_admin" || me.isSuperAdmin).map((r) => <Check key={r.id} name="roleIds" value={r.id} label={r.name} defaultChecked={rolesOf(m.id).includes(r.id)} />)}
                  </AdminForm>
                </Disclosure>}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 text-[11px] tracking-[0.18em] uppercase">Roles & permissions {!me.isSuperAdmin && <span className="normal-case tracking-normal text-charcoal/50">— only a Super Admin can edit</span>}</h2>
      <div className="grid gap-4">
        {roles.map((r) => {
          const perms = rolePerms.filter((x) => x.roleId === r.id).map((x) => x.permissionKey);
          return (
            <Card key={r.id} title={`${r.name} · ${perms.length} permissions`}>
              <p className="text-[12.5px] text-charcoal/60">{r.description}</p>
              {me.isSuperAdmin && r.key !== "super_admin" && (
                <div className="mt-3"><Disclosure label="Edit permissions" variant="ghost">
                  <AdminForm action={saveRoleAction} submit="Save role">
                    <input type="hidden" name="id" value={r.id} />
                    <Field label="Name" name="name" defaultValue={r.name} />
                    <TextareaField label="Description" name="description" defaultValue={r.description} rows={2} />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(Object.keys(PERMISSION_CATALOGUE) as Resource[]).map((res) => (
                        <fieldset key={res} className="rounded-[3px] border border-line p-3"><legend className="px-1 text-[11.5px]">{PERMISSION_CATALOGUE[res].label}</legend>
                          {(PERMISSION_CATALOGUE[res].actions as readonly string[]).map((a) => <Check key={a} name="permissions" value={`${res}.${a}`} label={a.replace(/_/g, " ")} defaultChecked={perms.includes(`${res}.${a}`)} />)}
                        </fieldset>
                      ))}
                    </div>
                  </AdminForm>
                </Disclosure></div>
              )}
            </Card>
          );
        })}
        {me.isSuperAdmin && (
          <Card title="New custom role">
            <AdminForm action={saveRoleAction} submit="Create role" resetOnSuccess>
              <Field label="Name" name="name" required />
              <TextareaField label="Description" name="description" rows={2} />
              <p className="text-[12px] text-charcoal/55">Create the role, then edit its permissions above.</p>
            </AdminForm>
          </Card>
        )}
      </div>
    </>
  );
}
