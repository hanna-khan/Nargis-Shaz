"use client";

import { Field, Input, Select } from "@/components/ui/form";
import type { Address, Country } from "@/types";

const PK_PROVINCES = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu & Kashmir"];
const US_STATES = ["Alabama", "Arizona", "California", "Colorado", "Florida", "Georgia", "Illinois", "Maryland", "Massachusetts", "Michigan", "New Jersey", "New York", "North Carolina", "Ohio", "Pennsylvania", "Texas", "Virginia", "Washington"];

/** International address form — fields and labels adapt to the destination country. */
export function AddressFields({ value, onChange, countries, errors }: { value: Address; onChange: (a: Address) => void; countries: Country[]; errors: Partial<Record<keyof Address, string>> }) {
  const country = countries.find((c) => c.code === value.countryCode) ?? countries[0];
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const f = country.addressFormat;
  const regionLabel = f === "pk" ? "Province" : f === "us" ? (country.code === "CA" ? "Province" : "State") : f === "gb" ? "County (optional)" : "Region (optional)";
  const postalLabel = f === "us" ? (country.code === "CA" ? "Postal code" : "ZIP code") : f === "gb" ? "Postcode" : f === "pk" ? "Postal code (optional)" : "Postal code";

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Country / region" className="col-span-2">
        <Select value={value.countryCode} onChange={set("countryCode")} autoComplete="country">
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="First name" error={errors.firstName}><Input value={value.firstName} onChange={set("firstName")} autoComplete="given-name" required /></Field>
      <Field label="Last name" error={errors.lastName}><Input value={value.lastName} onChange={set("lastName")} autoComplete="family-name" required /></Field>
      <Field label={f === "pk" ? "House / street address" : "Address"} className="col-span-2" error={errors.line1}><Input value={value.line1} onChange={set("line1")} autoComplete="address-line1" required /></Field>
      <Field label={f === "pk" ? "Area / sector (optional)" : "Apartment, suite (optional)"} className="col-span-2"><Input value={value.line2 ?? ""} onChange={set("line2")} autoComplete="address-line2" /></Field>
      <Field label="City" error={errors.city}><Input value={value.city} onChange={set("city")} autoComplete="address-level2" required /></Field>
      {f === "pk" || (f === "us" && country.code === "US") ? (
        <Field label={regionLabel} error={errors.region}>
          <Select value={value.region ?? ""} onChange={set("region")} autoComplete="address-level1" required>
            <option value="">Select…</option>
            {(f === "pk" ? PK_PROVINCES : US_STATES).map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
      ) : (
        <Field label={regionLabel}><Input value={value.region ?? ""} onChange={set("region")} autoComplete="address-level1" /></Field>
      )}
      <Field label={postalLabel} error={errors.postalCode}><Input value={value.postalCode ?? ""} onChange={set("postalCode")} autoComplete="postal-code" required={f !== "pk" && f !== "intl"} /></Field>
      <Field label="Phone" error={errors.phone} hint={f === "pk" ? "For courier and cash-on-delivery confirmation" : "For delivery updates"}>
        <div className="flex">
          <span className="grid place-items-center border border-r-0 border-line bg-ivory px-3 text-[13px]">{country.phonePrefix}</span>
          <Input value={value.phone} onChange={set("phone")} autoComplete="tel-national" inputMode="tel" required />
        </div>
      </Field>
    </div>
  );
}
