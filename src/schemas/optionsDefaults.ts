import type { OptionsT } from './optionsSchema';

export const optionsDefaults = {
  attributeNames: {
    styleName: 'className',
  },
  autoResolveMultipleImports: true,
  handleMissingStyleName: 'throw',
  localIdentName: '[file]__[local]__[hash:base64:6]',
} satisfies OptionsT;
