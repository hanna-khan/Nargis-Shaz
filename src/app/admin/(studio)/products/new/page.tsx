import { AdminForm, Field } from "@/components/admin/client";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { staffPage } from "@/server/admin/guard";
import { CURRENCIES } from "@/types";
import { createProductAction } from "../../../_actions/catalog";
import { ProductFields } from "../fields";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { allowed } = await staffPage("products.create");
  if (!allowed) return <NoAccess permission="products.create" />;
  return (
    <>
      <PageHeader title="New product" back={{ href: "/admin/products", label: "Products" }} description="Products are created as drafts. Add sizes, colours and images on the next screen, then publish." />
      <Card>
        <AdminForm action={createProductAction} submit="Create draft">
          <ProductFields p={{}} showStatus={false} />
          <fieldset className="grid gap-4 sm:grid-cols-4">
            <legend className="mb-2 text-[11.5px] text-charcoal/65">Prices (major units — e.g. 18500 for Rs 18,500)</legend>
            {CURRENCIES.map((c) => <Field key={c} label={c} name={`price_${c}`} inputMode="decimal" required={c === "PKR"} />)}
          </fieldset>
        </AdminForm>
      </Card>
    </>
  );
}
