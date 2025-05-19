export default function preset(api, options) {
  let envPreset = '@babel/env';
  if (options) envPreset = [envPreset, options];
  return {
    plugins: [
      '@babel/plugin-transform-flow-strip-types',
      '@babel/plugin-transform-runtime',
    ],
    presets: [
      envPreset,
    ],
  };
}
