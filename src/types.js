// @flow

export type StyleModuleMapType = {
  [key: string]: string,
  ...
};

export type StyleModuleImportMapType = {
  [key: string]: StyleModuleMapType,
  ...
};

export type GenerateScopedNameType = (
  localName: string,
  resourcePath: string,
) => string;

export type GenerateScopedNameConfigurationType =
  string | GenerateScopedNameType;

export type HandleMissingStyleNameOptionType = 'ignore' | 'throw' | 'warn';

export type GetClassNameOptionsType = {|
  handleMissingStyleName: HandleMissingStyleNameOptionType,
  autoResolveMultipleImports: boolean,
|};
