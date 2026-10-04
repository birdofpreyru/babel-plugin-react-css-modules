/* global console, clearTimeout, process, setTimeout */

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

import postcss, {
  type AcceptedPlugin,
  type PluginCreator,
  type Processor,
  type ProcessOptions,
  type Syntax,
  type LazyResult,
  type Root,
} from 'postcss';

import ExtractImports from 'postcss-modules-extract-imports';
import LocalByDefault from 'postcss-modules-local-by-default';
import newScopePlugin from 'postcss-modules-scope';
import Values from 'postcss-modules-values';

import parser from '@dr.pogodin/postcss-modules-parser';

import { optionsDefaults } from './schemas/optionsDefaults';
import type { OptionsT } from './schemas/optionsSchema';
import type { LocalIdentNameFunctionT, StyleModuleMapType } from './types';
import type { ResultT } from './worker';

const require = createRequire(import.meta.url);

type PluginType = [string, unknown] | string;

type FiletypeOptionsType = {
  plugins?: PluginType[];
  syntax: string;
};

type FiletypesConfigurationType = Record<string, FiletypeOptionsType>;

type OptionsType = {
  context: string | undefined;
  filetypes: FiletypesConfigurationType;
  localIdentName: LocalIdentNameFunctionT | string | undefined;
  transform: OptionsT['transform'] | undefined;
  uniqueName: string | undefined;
};

const buffer = new Uint8Array(new SharedArrayBuffer(0, {
  maxByteLength: 1024 * 1024, // 1MB.
}));

const bufferSize = new Float64Array(new SharedArrayBuffer(8));

let worker: Worker | undefined;
let workerTerminateId: NodeJS.Timeout | undefined;

type CacheBucketT = {
  compiled: boolean;

  /** Map: local class name > generated global class name. */
  tokens: Record<string, string>;
};

/** Map: full file path (with name) > CacheBucketT. */
let cache: Record<string, CacheBucketT> = {};

function waitResult(): ResultT {
  while (!bufferSize[0]);
  const data = Buffer.from(buffer.buffer, 0, bufferSize[0]);
  return JSON.parse(data.toString('utf8')) as ResultT;
}

function ensureWorkerStarted() {
  if (workerTerminateId || !worker) cache = {};

  if (workerTerminateId) {
    clearTimeout(workerTerminateId);
    workerTerminateId = undefined;
  }

  worker ??= new Worker(`${import.meta.dirname}/worker.js`);
}

export function stopWorker(): void {
  if (worker && !workerTerminateId) {
    workerTerminateId = setTimeout(() => {
      if (!worker) throw Error('Internal error');
      void worker.terminate();
      worker = undefined;
      workerTerminateId = undefined;
    }, 1000);
  }
}

function getFiletypeOptions(
  cssSourceFilePath: string,
  filetypes: FiletypesConfigurationType | null,
): FiletypeOptionsType | null {
  const extension = cssSourceFilePath.slice(cssSourceFilePath.lastIndexOf('.'));
  const filetype = filetypes ? filetypes[extension] : null;

  return filetype ?? null;
}

const getExtraPlugins = (
  filetypeOptions: FiletypeOptionsType | null | undefined,
): AcceptedPlugin[] => {
  if (!filetypeOptions?.plugins) {
    return [];
  }

  return filetypeOptions.plugins.map((plugin) => {
    if (Array.isArray(plugin)) {
      const [pluginName, pluginOptions] = plugin;

      // eslint-disable-next-line import/no-dynamic-require
      return (require(pluginName) as PluginCreator<unknown>)(pluginOptions) as
        AcceptedPlugin;
    }

    // eslint-disable-next-line import/no-dynamic-require
    return require(plugin) as AcceptedPlugin;
  });
};

const getTokens = (
  extraPluginsRunner: Processor | undefined,
  runner: Processor,
  cssSourceFilePath: string,
  filetypeOptions: FiletypeOptionsType | null,
  pluginOptions: OptionsType,
): StyleModuleMapType => {
  const options: ProcessOptions = {
    from: cssSourceFilePath,
  };

  if (filetypeOptions) {
    // eslint-disable-next-line import/no-dynamic-require
    options.syntax = require(filetypeOptions.syntax) as Syntax;
  }

  let sourceCss = readFileSync(cssSourceFilePath, 'utf-8');

  if (pluginOptions.transform) {
    sourceCss = pluginOptions.transform(
      sourceCss,
      cssSourceFilePath,
      pluginOptions,
    );
  }

  let intermediate: LazyResult | string = sourceCss;

  if (extraPluginsRunner) {
    intermediate = extraPluginsRunner.process(sourceCss, options);
  }

  const postcssResult = runner.process(intermediate, options);

  postcssResult.warnings().forEach((message) => {
    // eslint-disable-next-line no-console
    console.warn(message.text);
  });

  if (typeof pluginOptions.localIdentName === 'function') {
    return ((postcssResult as LazyResult<Root>).root as unknown as {
      tokens: StyleModuleMapType;
    }).tokens;
  }

  const bucket = cache[cssSourceFilePath];
  if (!bucket) throw Error('Missing bucket');
  if (bucket.compiled) return bucket.tokens;

  let css = '';
  for (const className of Object.keys(bucket.tokens)) {
    css += `.${className} {}\n`;
  }

  bufferSize[0] = 0;

  if (!worker) throw Error('Missing worker');

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
  let runner: Processor | undefined;
  let generateScopedName;

  if (typeof options.localIdentName === 'function') {
    generateScopedName = (
      clazz: string,
      resourcePath: string,
    ) => {
      if (typeof options.localIdentName !== 'function') {
        throw Error('Internal error');
      }

      return options.localIdentName({
        local: clazz,
        module: { resource: resourcePath },
      });
    };
  } else {
    ensureWorkerStarted();

    if (!worker) throw Error('Missing worker');

    worker.postMessage({
      additionalFileTypes: Object.keys(options.filetypes),
      buffer,
      bufferSize,
      context: options.context ?? process.cwd(),
      localIdentName: options.localIdentName ?? optionsDefaults.localIdentName,
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
      } else bucket.tokens[localClassName] = '';

      return '.placeholder';
    };
  }

  const filetypeOptions = getFiletypeOptions(
    cssSourceFilePath,
    options.filetypes,
  );

  const extraPlugins = getExtraPlugins(filetypeOptions);

  const extraPluginsRunner = extraPlugins.length
    ? postcss(extraPlugins) : undefined;

  const fetch = (to: string, from: string) => {
    const fromDirectoryPath = dirname(from);
    const toPath = resolve(fromDirectoryPath, to);

    if (!runner) throw Error('Missing runner');

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
