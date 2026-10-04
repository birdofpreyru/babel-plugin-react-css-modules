import type { z } from 'zod';

import type { PluginPass } from '@babel/core';

import type {
  OptionsT,
  compilationInfoSchema,
  localIdentNameFunctionSchema,
} from './schemas/optionsSchema';

export type StyleModuleMapType = Record<string, string>;

export type StyleModuleImportMapType = Record<string, StyleModuleMapType>;

export type CompilationInfoT = z.infer<typeof compilationInfoSchema>;

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

export type StatsT = PluginPass<OptionsT>;
