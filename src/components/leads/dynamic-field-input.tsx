"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LeadFieldDefinition } from "@/lib/leads/field-values";

export type DynamicFieldValue = string | number | boolean | string[] | null;

function toExternalHref(value: string): string {
  return value.includes("://") ? value : `https://${value}`;
}

function isValidExternalUrl(value: string): boolean {
  try {
    new URL(toExternalHref(value));
    return true;
  } catch {
    return false;
  }
}

interface UrlCompactFieldProps {
  field: LeadFieldDefinition;
  value: DynamicFieldValue;
  onChange: (value: DynamicFieldValue) => void;
  disabled?: boolean;
}

function UrlCompactField({ field, value, onChange, disabled = false }: UrlCompactFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputId = `field-${field.id}`;
  const urlValue = typeof value === "string" ? value.trim() : "";
  const href = urlValue && isValidExternalUrl(urlValue) ? toExternalHref(urlValue) : null;
  const showLink = href && !isEditing;

  if (showLink) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 truncate text-sm text-primary hover:underline"
        >
          {urlValue}
        </a>
        {!disabled ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="shrink-0 text-muted-foreground text-xs hover:text-foreground"
          >
            Edit
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <Input
      id={inputId}
      type="text"
      value={urlValue}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => setIsEditing(false)}
      autoFocus={isEditing}
      placeholder={field.label}
      required={field.required}
      disabled={disabled}
    />
  );
}

interface DynamicFieldInputProps {
  field: LeadFieldDefinition;
  value: DynamicFieldValue;
  onChange: (value: DynamicFieldValue) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function DynamicFieldInput({
  field,
  value,
  onChange,
  disabled = false,
  compact = false,
}: DynamicFieldInputProps) {
  const inputId = `field-${field.id}`;

  switch (field.fieldType) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
      return (
        <Input
          id={inputId}
          type={field.fieldType === "EMAIL" ? "email" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.label}
          required={field.required}
          disabled={disabled}
        />
      );

    case "URL":
      if (compact) {
        return (
          <UrlCompactField field={field} value={value} onChange={onChange} disabled={disabled} />
        );
      }

      return (
        <Input
          id={inputId}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.label}
          required={field.required}
          disabled={disabled}
        />
      );

    case "TEXTAREA":
      return (
        <Textarea
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.label}
          required={field.required}
          disabled={disabled}
          rows={4}
        />
      );

    case "NUMBER":
      return (
        <Input
          id={inputId}
          type="number"
          value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          placeholder={field.label}
          required={field.required}
          disabled={disabled}
        />
      );

    case "DATE":
      return (
        <DatePicker
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(nextValue) => onChange(nextValue || null)}
          placeholder={field.label}
          required={field.required}
          disabled={disabled}
        />
      );

    case "SELECT":
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(nextValue) => onChange(nextValue ?? null)}
          disabled={disabled}
        >
          <SelectTrigger id={inputId} className="w-full">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "MULTI_SELECT":
      return (
        <div className="space-y-2 rounded-lg border p-3">
          {field.options.length === 0 ? (
            <p className="text-muted-foreground text-sm">No options configured for this field.</p>
          ) : (
            field.options.map((option) => {
              const selected = Array.isArray(value) ? value.includes(option) : false;
              const optionId = `${inputId}-${option}`;

              return (
                <label key={option} htmlFor={optionId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={optionId}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(value) ? value : [];
                      if (checked) {
                        onChange([...current, option]);
                        return;
                      }
                      onChange(current.filter((item) => item !== option));
                    }}
                    disabled={disabled}
                  />
                  {option}
                </label>
              );
            })
          )}
        </div>
      );

    case "CHECKBOX":
      return (
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm">
          <Checkbox
            id={inputId}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            disabled={disabled}
          />
          {field.label}
        </label>
      );

    default:
      return (
        <Input
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      );
  }
}

interface DynamicFieldListProps {
  fields: LeadFieldDefinition[];
  values: Record<string, DynamicFieldValue>;
  onChange: (fieldId: string, value: DynamicFieldValue) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function DynamicFieldList({
  fields,
  values,
  onChange,
  disabled = false,
  compact = false,
}: DynamicFieldListProps) {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This campaign type has no custom fields. You can still create a lead and assign it to a
        stage.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
            {field.fieldType !== "CHECKBOX" ? (
              <>
                <Label
                  htmlFor={`field-${field.id}`}
                  className="shrink-0 text-muted-foreground text-xs sm:w-28 sm:pt-2"
                >
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                <div className="min-w-0 flex-1">
                  <DynamicFieldInput
                    field={field}
                    value={values[field.id] ?? null}
                    onChange={(value) => onChange(field.id, value)}
                    disabled={disabled}
                    compact
                  />
                </div>
              </>
            ) : (
              <div className="sm:pl-28">
                <DynamicFieldInput
                  field={field}
                  value={values[field.id] ?? false}
                  onChange={(value) => onChange(field.id, value)}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.id}
          className={
            field.fieldType === "TEXTAREA" || field.fieldType === "MULTI_SELECT"
              ? "md:col-span-2"
              : ""
          }
        >
          {field.fieldType !== "CHECKBOX" ? (
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}`}>
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              <DynamicFieldInput
                field={field}
                value={values[field.id] ?? null}
                onChange={(value) => onChange(field.id, value)}
                disabled={disabled}
              />
            </div>
          ) : (
            <DynamicFieldInput
              field={field}
              value={values[field.id] ?? false}
              onChange={(value) => onChange(field.id, value)}
              disabled={disabled}
            />
          )}
        </div>
      ))}
    </div>
  );
}
