// It encapsulates Webpack compiler to be run in a dedicated thread, allowing
// to asynchronously generate class names using Webpack's logic, and wait for
// them within synchronous code in the main thread (as the Babel plugin must
// be synchronous).

import { Buffer } from 'node:buffer';
import { dirname } from 'node:path';
import { parentPort } from 'node:worker_threads';

import { Volume, createFsFromVolume } from 'memfs';

import webpack, {
  type Compiler,
  type InputFileSystem,
  type Module,
  type OutputFileSystem,
} from 'webpack';

const fs = createFsFromVolume(new Volume());

// These are settings of the current compiler instance.
let context: string | undefined;
let localIdentName: string | undefined;
let filetypes = '\\.css';
let uniqueName: string | undefined;

// Webpack compiler instance.
let compiler: Compiler | undefined;

// Shared buffers for backward communication with the parent thread
// (we can't use the normal inter-thread messaging, as the parent thread
// has to wait for the result by blocking itself inside synchronous code).
let buffer: Uint8Array<SharedArrayBuffer> | undefined;
let bufferSize: Float64Array;

type ErrorResultT = {
  error: string;
  type: 'error';
};

type SuccessResultT = {
  mapEntries: Array<[string, string]>;
  type: 'result';
};

export type ResultT = ErrorResultT | SuccessResultT;

/**
 * Posts `result` to the master thread via the shared `buffer` and `bufferSize`
 * buffers.
 */
function postResult(result: ResultT) {
  if (!buffer) throw Error('Missing communication');

  const data = Buffer.from(JSON.stringify(result));
  if (data.length > buffer.buffer.byteLength) {
    buffer.buffer.grow(data.length);
  }
  data.copy(buffer);
  bufferSize[0] = data.length;
}

type ConfigMessageT = {
  additionalFileTypes: Array<`.${string}`> | undefined;
  buffer: Uint8Array<SharedArrayBuffer>;
  bufferSize: Float64Array;
  context: string;
  localIdentName: string;
  type: 'config';
  uniqueName: string | undefined;
};

function onConfig(message: ConfigMessageT) {
  ({ buffer, bufferSize } = message);

  const newFileTypes = [
    '\\.css',
    ...message.additionalFileTypes?.map((item) => `\\${item}`) ?? [],
  ].join('|');

  if (
    !compiler
    || context !== message.context
    || filetypes !== newFileTypes
    || localIdentName !== message.localIdentName
    || uniqueName !== message.uniqueName
  ) {
    filetypes = newFileTypes;
    ({ context, localIdentName, uniqueName } = message);

    compiler = webpack({
      context,
      entry: '/index.js',
      experiments: { css: true },
      mode: 'development',
      module: {
        generator: {
          'css/module': {
            exportsOnly: true,
            localIdentName,
          },
        },
        rules: [{
          test: new RegExp(`${filetypes}$`),
          type: 'css/module',
        }],
      },
      optimization: {
        minimize: false,
      },
      output: {
        path: '/output',
        uniqueName,
      },
    });

    compiler.inputFileSystem = fs as InputFileSystem;
    compiler.outputFileSystem = fs as OutputFileSystem;
  }
}

type CssMessageT = {
  css: string;
  path: string;
  type: 'css';
};

function onCss({ css, path }: CssMessageT) {
  if (!compiler) throw Error('Missing compiler');

  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, css);
  fs.writeFileSync('/index.js', `import * as S from '${path}';console.log(S)`);

  compiler.run((error, stats) => {
    try {
      if (error) {
        postResult({ error: error.message, type: 'error' });
      } else if (stats?.hasErrors()) {
        postResult({
          error: stats.toJson().errors!
            .map((item) => item.message)
            .join('; '),
          type: 'error',
        });
      } else {
        const modules = Array.from<Module>(
          // @ts-expect-error "TODO: Correct it later - we should stats?.compilation.findModule() to get the module!"
          ...stats?.compilation.modules ?? [],
        );
        const cssModule = modules.find((m) => m.type === 'css/module');
        const result = (cssModule?.buildInfo?.cssData as {
          exports: Map<string, string>;
        } | undefined)?.exports;

        postResult({
          mapEntries: Array.from(result?.entries() ?? []),
          type: 'result',
        });
      }
    } catch (e) {
      postResult({
        error: e instanceof Error ? e.message : 'Unknown error',
        type: 'error',
      });
    }
  });
}

type MessageT = ConfigMessageT | CssMessageT;

parentPort!.on('message', (message: MessageT) => {
  switch (message.type) {
    case 'config':
      onConfig(message);
      break;
    case 'css':
      onCss(message);
      break;
    default: throw Error('Unexpected message type');
  }
});
