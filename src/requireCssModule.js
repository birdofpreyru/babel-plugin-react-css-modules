// @flow

/* global $ReadOnlyArray, console, process, require */

import {
  readFileSync,
} from 'fs';
import {
  dirname,
  resolve,
} from 'path';
import Parser from '@dr.pogodin/postcss-modules-parser';
import postcss from 'postcss';
import ExtractImports from 'postcss-modules-extract-imports';
import LocalByDefault from 'postcss-modules-local-by-default';
import newScopePlugin from 'postcss-modules-scope';
import Values from 'postcss-modules-values';
import getLocalIdent, {
  unescape,
} from './getLocalIdent';
import optionsDefaults from './schemas/optionsDefaults';
import type {
  GenerateScopedNameConfigurationType,
  StyleModuleMapType,
} from './types';

type PluginType = string | $ReadOnlyArray<[string, mixed]>;

type FiletypeOptionsType = {|
  +syntax: string,
  +plugins?: $ReadOnlyArray<PluginType>,
|};

type FiletypesConfigurationType = {
  [key: string]: FiletypeOptionsType,
  ...
};

type SyntaxType = Function | Object;

type OptionsType = {|
  filetypes: FiletypesConfigurationType,
  generateScopedName?: GenerateScopedNameConfigurationType,
  context?: string,
  transform?: Function
|};

const getFiletypeOptions = (
  cssSourceFilePath: string,
  filetypes: FiletypesConfigurationType,
): ?FiletypeOptionsType => {
  const extension = cssSourceFilePath.slice(cssSourceFilePath.lastIndexOf('.'));
  const filetype = filetypes ? filetypes[extension] : null;

  return filetype;
};

const getSyntax = (filetypeOptions: FiletypeOptionsType): ?(SyntaxType) => {
  if (!filetypeOptions || !filetypeOptions.syntax) {
    return null;
  }

  // eslint-disable-next-line import/no-dynamic-require
  return require(filetypeOptions.syntax);
};

const getExtraPlugins = (
  filetypeOptions: ?FiletypeOptionsType,
): $ReadOnlyArray<any> => {
  if (!filetypeOptions || !filetypeOptions.plugins) {
    return [];
  }

  return filetypeOptions.plugins.map((plugin) => {
    if (Array.isArray(plugin)) {
      const [pluginName, pluginOptions] = plugin;

      // eslint-disable-next-line import/no-dynamic-require
      return require(pluginName)(pluginOptions);
    }

    // eslint-disable-next-line import/no-dynamic-require
    return require(plugin);
  });
};

const getTokens = (
  extraPluginsRunner: any,
  runner: any,
  cssSourceFilePath: string,
  filetypeOptions: ?FiletypeOptionsType,
  pluginOptions: OptionsType,
): StyleModuleMapType => {
  const options: Object = {
    from: cssSourceFilePath,
  };

  if (filetypeOptions) {
    options.syntax = getSyntax(filetypeOptions);
  }

  let res = readFileSync(cssSourceFilePath, 'utf-8');

  if (pluginOptions.transform) {
    res = pluginOptions.transform(res, cssSourceFilePath, pluginOptions);
  }

  if (extraPluginsRunner) {
    res = extraPluginsRunner.process(res, options);
  }

  res = runner.process(res, options);

  res.warnings().forEach((message) => {
    // eslint-disable-next-line no-console
    console.warn(message.text);
  });

  return res.root.tokens;
};

export default (
  cssSourceFilePath: string,
  options: OptionsType,
): StyleModuleMapType => {
  // eslint-disable-next-line prefer-const
  let runner: any;
  let generateScopedName;

  if (options.generateScopedName && typeof options.generateScopedName === 'function') {
    ({ generateScopedName } = options);
  } else {
    generateScopedName = (clazz: string, resourcePath: string) => getLocalIdent(
      // TODO: The loader context used by "css-loader" may has additional
      // stuff inside this argument (loader context), allowing for some edge
      // cases (though, presumably not with a typical configurations)
      // we don't support (yet?).
      { resourcePath },

      options.generateScopedName || optionsDefaults.generateScopedName,
      unescape(clazz),
      {
        clazz,
        context: options.context || process.cwd(),

        // TODO: These options should match their counterparts in Webpack
        // configuration:
        //  - https://webpack.js.org/configuration/output/#outputhashdigest
        //  - https://webpack.js.org/configuration/output/#outputhashdigestlength
        //  - https://webpack.js.org/configuration/output/#outputhashfunction
        //  - https://webpack.js.org/configuration/output/#outputhashsalt
        // and they should be exposed as babel-plugin-react-css-modules
        // options. However, for now they are just hardcoded equal to
        // the Webpack's default settings.
        hashDigest: 'hex',
        hashDigestLength: 20,
        hashFunction: 'md4',
        hashSalt: '',

        // TODO: This option was introduced by css-loader@6.6.0.
        // To keep getLocalIdent() in sync with css-loader implementation,
        // I updated the code there, but similar to the parameters above,
        // it is not yet exposed as this plugin's option.
        hashStrategy: 'resource-path-and-local-name',

        // TODO: This one allows for some path modifications during
        // the transform. Probably, not a Webpack param.
        regExp: '',
      },
    );
  }

  const filetypeOptions = getFiletypeOptions(
    cssSourceFilePath,
    options.filetypes,
  );

  const extraPlugins = getExtraPlugins(filetypeOptions);
  const extraPluginsRunner = extraPlugins.length && postcss(extraPlugins);

  const fetch = (to: string, from: string) => {
    const fromDirectoryPath = dirname(from);
    const toPath = resolve(fromDirectoryPath, to);

    return getTokens(
      extraPluginsRunner,
      runner,
      toPath,
      filetypeOptions,
      options,
    );
  };

  const plugins = [
    Values,
    LocalByDefault,
    ExtractImports,
    newScopePlugin({
      generateScopedName,
    }),
    new Parser({
      fetch,
    }),
  ];

  runner = postcss(plugins);

  return getTokens(
    extraPluginsRunner,
    runner,
    cssSourceFilePath,
    filetypeOptions,
    options,
  );
};
