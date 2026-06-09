import { z } from "zod";
import { FieldType } from "@/generated/prisma/client";
import { cuidSchema, fieldKeySchema, slugSchema } from "./common";

const fieldTypeSchema = z.nativeEnum(FieldType);

export const inferredFieldSchema = z.object({
  key: fieldKeySchema,
  label: z.string().min(1).max(120),
  fieldType: fieldTypeSchema,
  sourceColumn: z.string().min(1),
  required: z.boolean(),
  options: z.array(z.string().min(1)).optional(),
});

export const importDestinationSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing_campaign"),
    campaignTypeId: cuidSchema,
    campaignId: cuidSchema,
  }),
  z.object({
    mode: z.literal("new_campaign"),
    campaignTypeId: cuidSchema,
    campaignName: z.string().min(1).max(120),
  }),
  z.object({
    mode: z.literal("new_type"),
    typeName: z.string().min(1).max(120),
    typeSlug: slugSchema,
    campaignName: z.string().min(1).max(120),
  }),
]);

export const columnMappingSchema = z.object({
  sourceColumn: z.string().min(1),
  fieldKey: fieldKeySchema.nullable(),
});

export const importMappingSchema = z.object({
  destination: importDestinationSchema,
  fields: z.array(inferredFieldSchema).min(1),
  columnMappings: z.array(columnMappingSchema).min(1),
});

export const analyzeImportSchema = z.object({
  importId: cuidSchema,
});

export const commitImportSchema = z.object({
  importId: cuidSchema,
  mapping: importMappingSchema,
});

export type ImportMappingInput = z.infer<typeof importMappingSchema>;
