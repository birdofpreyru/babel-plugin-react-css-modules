// @flow

/* global console, clearTimeout, process, setTimeout */

// TODO: Flow-bin has issues with using "node:" prefix.
// eslint-disable-next-line import/enforce-node-protocol-usage
import { Buffer } from 'buffer';

// TODO: Flow-bin has issues with using "node:" prefix.
// eslint-disable-next-line import/enforce-node-protocol-usage
import { readFileSync } from 'fs';

// TODO: Flow-bin has issues with using "node:" prefix.
// eslint-disable-next-line import/enforce-node-protocol-usage
import { createRequire } from 'module';

// TODO: Flow-bin has issues with using "node:" prefix.
// eslint-disable-next-line import/enforce-node-protocol-usage
import { dirname, resolve } from 'path';

// TODO: Flow-bin has issues with using "node:" prefix.
// eslint-disable-next-line import/enforce-node-protocol-usage
import { Worker } from 'worker_threads';

import postcss from 'postcss';
import ExtractImports from 'postcss-modules-extract-imports';
import LocalByDefault from 'postcss-modules-local-by-default';
import newScopePlugin from 'postcss-modules-scope';
import Values from 'postcss-modules-values';

import parser from '@dr.pogodin/postcss-modules-parser';

import optionsDefaults from './schemas/optionsDefaults';

import type {
  GenerateScopedNameConfigurationType,
  StyleModuleMapType,
} from './types';

// $FlowFixMe
const require = createRequire(import.meta.url);

type PluginType = string | /* readonly */ Array<[string, mixed]>;

type FiletypeOptionsType = {|
  +syntax: string,
  +plugins?: /* readonly */ Array<PluginType>,
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

const buffer = new Uint8Array(new SharedArrayBuffer(0, {
  maxByteLength: 1024 * 1024, // 1MB.
}));

const bufferSize = new Float64Array(new SharedArrayBuffer(8));

let worker;
let workerTerminateId;

/**
 * The first-level cache = full file path + name.
 * The object: {
 *   compiled: boolean;
 *   tokens: {
 *     [local]: 'transformed';
 *   }
 * }
 */
let cache = {};

function waitResult() {
  while (!bufferSize[0]);
  const data = Buffer.from(buffer.buffer, 0, bufferSize[0]);
  return JSON.parse(data.toString('utf8'));
}

function ensureWorkerStarted() {
  if (workerTerminateId || !worker) cache = {};

  if (workerTerminateId) {
    clearTimeout(workerTerminateId);
    workerTerminateId = undefined;
  } else if (!worker) {
    worker = new Worker(`${import.meta.dirname}/worker.js`);
  }
}

export function stopWorker() {
  if (worker && !workerTerminateId) {
    workerTerminateId = setTimeout(() => {
      worker.terminate();
      worker = undefined;
      workerTerminateId = undefined;
    }, 1000);
  }
}

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
): /* readonly */ Array<any> => {
  if (!filetypeOptions || !filetypeOptions.plugins) {
    return [];
  }

  return filetypeOptions.plugins.map((plugin) => {
    if (Array.isArray(plugin)) {
      const [pluginName, pluginOptions] = plugin;

      // $FlowFixMe
      return require(pluginName)(pluginOptions); // eslint-disable-line import/no-dynamic-require
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

  if (typeof pluginOptions.localIdentName === 'function') {
    return res.root.tokens;
  }

  const bucket = cache[cssSourceFilePath];
  if (bucket.compiled) return bucket.tokens;

  let css = '';
  for (const className of Object.keys(bucket.tokens)) {
    css += `.${className} {}\n`;
  }

  bufferSize[0] = 0;

  worker.postMessage({
    css,
    path: cssSourceFilePath,
    type: 'css',
  });

  const result = waitResult();

  let tokens;

  switch (result.type) {
    case 'error':
      throw Error(result.error);
    case 'result':
      tokens = Object.fromEntries(result.mapEntries);
      bucket.tokens = tokens;
      bucket.compiled = true;
      break;
    default:
      throw Error('Unexpected result type');
  }

  return tokens;
};

export default (
  cssSourceFilePath: string,
  options: OptionsType,
): StyleModuleMapType => {
  // eslint-disable-next-line prefer-const
  let runner: any;
  let generateScopedName;

  if (typeof options.localIdentName === 'function') {
    generateScopedName = (
      clazz: string,
      resourcePath: string,
    ) => options.localIdentName({
      local: clazz,
      module: { resource: resourcePath },
    });
  } else {
    ensureWorkerStarted();

    worker.postMessage({
      additionalFileTypes: options.filetypes && Object.keys(options.filetypes),
      buffer,
      bufferSize,
      context: options.context || process.cwd(),
      localIdentName: options.localIdentName || optionsDefaults.localIdentName,
      type: 'config',
      uniqueName: options.uniqueName,

      // TODO: Should we also pass over the config for:
      //  - localIdentHashFunction
      //  - localIdentHashDigest
      //  - localIdentHashDigestLength
      //  - localIdentHashSalt
      // or are we fine just relying on Webpack's defaults for them?
    });

    generateScopedName = (localClassName: string, resourcePath: string) => {
      let bucket = cache[resourcePath];

      if (!bucket) {
        bucket = { compiled: false, tokens: {} };
        cache[resourcePath] = bucket;
      }

      if (bucket.compiled) {
        if (!bucket.tokens[localClassName]) {
          throw Error(`Compiled tokens bucket is missing "${localClassName}" class name`);
        }
      } else bucket.tokens[localClassName] = null;

      return '.placeholder';
    };
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
    parser({
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
