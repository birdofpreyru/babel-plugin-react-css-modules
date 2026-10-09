import { z } from 'zod';

export const compilationInfoSchema = z.object({
  local: z.string().optional(),
  module: z.object({
    id: z.union([z.number(), z.string()]).nullish(),
    resource: z.string().optional(),
    type: z.string().optional(),
  }),
});

export const localIdentNameFunctionSchema = z.function({
  input: [compilationInfoSchema],
  output: z.string(),
});

const pluginSchema = z.union([
  z.string(),
  z.tuple([z.string(), z.unknown()]),
]);

const fileTypeSchema = z.strictObject({
  plugins: z.array(pluginSchema).optional(),
  syntax: z.string(),
});

export const optionsSchema = z.strictObject({
  attributeNames: z.record(z.string(), z.union([z.string(), z.null()])),
  autoResolveMultipleImports: z.boolean(),
  context: z.string(),
  exclude: z.string(),
  filetypes: z.record(z.string().startsWith('.'), fileTypeSchema),
  handleMissingStyleName: z.enum(['throw', 'warn', 'ignore']),

  localIdentName: z.union([
    z.string(),
    localIdentNameFunctionSchema,
  ]),

  replaceImport: z.boolean(),
  skip: z.boolean(),
  transform: z.function({
    input: [
      z.string(),
      z.string(),
      z.unknown() /* TODO: Type of this settings object. */,
    ],
    output: z.string(),
  }),
  uniqueName: z.string(),
}).partial();

export type OptionsT = z.infer<typeof optionsSchema>;
