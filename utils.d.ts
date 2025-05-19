// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface LoaderContextI {
  resourcePath: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
interface OptionsI {}

export function generateScopedNameFactory(
  localIdentName: string,
): (localName: string, assetPath: string) => string;

export function getLocalIdent(
  { resourcePath }: LoaderContextI,
  localIdentName: string,
  localName: string,
  options: OptionsI,
): string;

