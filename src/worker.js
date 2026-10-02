// It encapsulates Webpack compiler to be run in a dedicated thread, allowing
// to asynchronously generate class names using Webpack's logic, and wait for
// them within synchronous code in the main thread (as the Babel plugin must
// be synchronous).

import { Buffer } from 'node:buffer';
import { dirname } from 'node:path';
import { parentPort } from 'node:worker_threads';

import { Volume, createFsFromVolume } from 'memfs';
import webpack from 'webpack';

const fs = createFsFromVolume(new Volume());

// These are settings of the current compiler instance.
let context;
let localIdentName;
let filetypes = '\\.css';
let uniqueName;

// Webpack compiler instance.
let compiler;

// Shared buffers for backward communication with the parent thread
// (we can't use the normal inter-thread messaging, as the parent thread
// has to wait for the result by blocking itself inside synchronous code).
let buffer;
let bufferSize;

/**
 * Posts `result` to the master thread via the shared `buffer` and `bufferSize`
 * buffers.
 */
function postResult(result) {
  const data = Buffer.from(JSON.stringify(result));
  if (data.length > buffer.buffer.byteLength) {
    buffer.buffer.grow(data.length);
  }
  data.copy(buffer);
  bufferSize[0] = data.length;
}

function onConfig(message) {
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

    compiler.inputFileSystem = fs;
    compiler.outputFileSystem = fs;
  }
}

function onCss({ css, path }) {
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, css);
  fs.writeFileSync('/index.js', `import * as S from '${path}';console.log(S)`);

  compiler.run((error, stats) => {
    try {
      if (error || stats.hasErrors()) {
        postResult({
          error: error || stats.toJson().errors,
          type: 'error',
        });
      } else {
        const cssModule = stats.compilation.modules.find(
          (m) => m.type === 'css/module',
        );
        const result = cssModule?.buildInfo?.cssData?.exports;

        postResult({
          mapEntries: Array.from(result?.entries()),
          type: 'result',
        });
      }
    } catch (e) {
      postResult({ error: e, type: 'error' });
    }
  });
}

parentPort.on('message', (message) => {
  switch (message.type) {
    case 'config': return onConfig(message);
    case 'css': return onCss(message);
    default: throw Error(`Unexpected message type "${message.type}"`);
  }
});
