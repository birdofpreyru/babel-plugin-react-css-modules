import { z } from 'zod';

import { localIdentNameFunctionSchema } from '../types';

const pluginSchema = z.union([
  z.string(),
  z.tuple([z.string(), z.unknown()]),
]);

const fileTypeSchema = z.strictObject({
  plugins: z.array(pluginSchema).optional(),
  syntax: z.string(),
});

export const optionsSchema = z.strictObject({
  attributeNames: {
    additionalProperties: false,
    patternProperties: z.record(
      z.string(),
      z.union(z.string(), z.null()),
    ),
  },
  autoResolveMultipleImports: z.boolean(),
  context: z.string(),
  exclude: z.string(),
  filetypes: z.record(z.string().startsWith('.'), fileTypeSchema),
  handleMissingStyleName: z.enum(['throw', 'warn', 'ignore']),

  localIdentName: z.union([
    z.string(),
    localIdentNameFunctionSchema,
  ]),

  /** @deprecated */
  removeImport: z.boolean(),

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
  webpackHotModuleReloading: z.union([z.boolean(), z.enum(['commonjs'])]),
}).partial();

export type OptionsT = z.infer<typeof optionsSchema>;
