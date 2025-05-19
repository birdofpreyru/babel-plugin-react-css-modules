// TODO: These type declarations are non-exhaustive, still pending to add all
// supported options.

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
interface PostcssPluginOptionsI {}

type PostcssPluginT = string | [string, PostcssPluginOptionsI];

export type PluginOptionsT = {
  autoResolveMultipleImports: boolean;

  filetypes?: Record<`.${string}`, {
    plugins?: PostcssPluginT[];
    syntax: string;
  }>;

  generateScopedName?: string
    | ((name: string, filename: string, css: string) => string);

  replaceImport?: boolean;
};
