"use client";

import { useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import type { AttributeField } from "@/lib/sports";

/**
 * Adapter-driven form fragment for the sport-specific portion of the facility
 * form. Renders inputs based on the adapter's `formFields` declaration so
 * adding a new sport never requires touching this component.
 */
export function AttributesForm({
  fields,
  initial,
  namePrefix = "attr_",
}: {
  fields: ReadonlyArray<AttributeField>;
  initial: Record<string, unknown>;
  /** Form field names are prefixed so the server action can demux them. */
  namePrefix?: string;
}) {
  // Stored as strings (form-friendly); converted back to typed values
  // on the server by the adapter's zod schema.
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
        if (field.kind === "select") {
          return (
            <div key={field.name}>
              <Label htmlFor={inputName}>{field.label}</Label>
              <Select
                id={inputName}
                name={inputName}
                value={values[field.name] ?? ""}
                onChange={(e) => update(field.name, e.target.value)}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
              {field.label}
            </label>
          );
        }
        if (field.kind === "number") {
          return (
            <div key={field.name}>
              <Label htmlFor={inputName}>
                {field.label}
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
            <Label htmlFor={inputName}>{field.label}</Label>
            <Input
              id={inputName}
              name={inputName}
              type="text"
              placeholder={field.placeholder}
              value={values[field.name] ?? ""}
              onChange={(e) => update(field.name, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
