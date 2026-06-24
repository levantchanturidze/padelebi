"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label, Select } from "@/components/ui/input";
import type { AttributeField } from "@/lib/sports";

/**
 * Adapter-driven sport-specific form fragment. All labels come from translation
 * keys declared by the adapter, so switching locale switches every label.
 */
export function AttributesForm({
  fields,
  initial,
  namePrefix = "attr_",
}: {
  fields: ReadonlyArray<AttributeField>;
  initial: Record<string, unknown>;
  namePrefix?: string;
}) {
  // next-intl's `t` at the root translates by dot path, so we can pass any key.
  const t = useTranslations();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      const v = initial[f.name];
      if (f.kind === "boolean") out[f.name] = v ? "on" : "";
      else if (v === undefined || v === null) out[f.name] = "";
      else out[f.name] = String(v);
    }
    return out;
  });

  function update(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  if (fields.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const inputName = `${namePrefix}${field.name}`;
        const label = t(field.labelKey as never);

        if (field.kind === "select") {
          return (
            <div key={field.name}>
              <Label htmlFor={inputName}>{label}</Label>
              <Select
                id={inputName}
                name={inputName}
                value={values[field.name] ?? ""}
                onChange={(e) => update(field.name, e.target.value)}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey as never)}
                  </option>
                ))}
              </Select>
            </div>
          );
        }
        if (field.kind === "boolean") {
          const checked = values[field.name] === "on";
          return (
            <label key={field.name} className="flex items-center gap-2 text-sm sm:mt-7">
              <input
                type="checkbox"
                name={inputName}
                checked={checked}
                onChange={(e) => update(field.name, e.target.checked ? "on" : "")}
                className="h-4 w-4 accent-[var(--color-brand-500)]"
              />
              {label}
            </label>
          );
        }
        if (field.kind === "number") {
          return (
            <div key={field.name}>
              <Label htmlFor={inputName}>
                {label}
                {field.suffix ? <span className="ml-1 text-muted">({field.suffix})</span> : null}
              </Label>
              <Input
                id={inputName}
                name={inputName}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                value={values[field.name] ?? ""}
                onChange={(e) => update(field.name, e.target.value)}
              />
            </div>
          );
        }
        return (
          <div key={field.name} className="sm:col-span-2">
            <Label htmlFor={inputName}>{label}</Label>
            <Input
              id={inputName}
              name={inputName}
              type="text"
              placeholder={field.placeholderKey ? t(field.placeholderKey as never) : undefined}
              value={values[field.name] ?? ""}
              onChange={(e) => update(field.name, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
