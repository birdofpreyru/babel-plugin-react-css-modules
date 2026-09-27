// TODO: These type declarations are non-exhaustive, still pending to add all
// supported options.

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface
interface PostcssPluginOptionsI {}

type PostcssPluginT = [string, PostcssPluginOptionsI] | string;

export type PluginOptionsT = {
  autoResolveMultipleImports: boolean;

  context?: string;

  filetypes?: Record<`.${string}`, {
    plugins?: PostcssPluginT[];
    syntax: string;
  }>;

  generateScopedName?: string;
  replaceImport?: boolean;
  uniqueName?: string;
};
