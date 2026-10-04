import type { OptionsT } from './optionsSchema';

export const optionsDefaults: OptionsT = {
  attributeNames: {
    styleName: 'className',
  },
  autoResolveMultipleImports: true,
  handleMissingStyleName: 'throw',
  localIdentName: '[file]__[local]__[hash:base64:6]',
};
