import { z } from 'zod';

export type StyleModuleMapType = Record<string, string>;

export type StyleModuleImportMapType = Record<string, StyleModuleMapType>;

export const compilationInfoSchema = z.object({
  local: z.string(),
  module: z.object({
    resource: z.string(),
  }),
});

export type CompilationInfoT = z.infer<typeof compilationInfoSchema>;

export const localIdentNameFunctionSchema = z.function({
  input: [compilationInfoSchema],
  output: z.string(),
});

export type LocalIdentNameFunctionT
  = z.infer<typeof localIdentNameFunctionSchema>;

export type GenerateScopedNameType = (
  localName: string,
  resourcePath: string,
) => string;

export type HandleMissingStyleNameOptionType = 'ignore' | 'throw' | 'warn';

export type GetClassNameOptionsType = {
  autoResolveMultipleImports: boolean;
  handleMissingStyleName: HandleMissingStyleNameOptionType;
};
