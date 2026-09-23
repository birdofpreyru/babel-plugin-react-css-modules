import { Buffer } from 'node:buffer';
import { dirname } from 'node:path';
import { parentPort } from 'node:worker_threads';

import { Volume, createFsFromVolume } from 'memfs';
import webpack from 'webpack';

const fs = createFsFromVolume(new Volume());

let compiler;
let localIdentName;
let filetypes = '\\.css';

let buffer;

// That's fine, it is watched and read on the master thread.
let resultSize; // Float64Array.

/**
 * Posts `result` to the master thread via the shared `buffer` and `resultSize`.
 */
function postResult(result) {
  const data = Buffer.from(JSON.stringify(result));
  if (data.length > buffer.buffer.byteLength) {
    buffer.buffer.grow(data.length);
  }
  data.copy(buffer);
  resultSize[0] = data.length;
}

parentPort.on('message', (message) => {
  switch (message.type) {
    case 'config': {
      ({ buffer, resultSize } = message);

      const newFileTypes = [
        '\\.css',
        ...message.additionalFileTypes?.map((item) => `\\${item}`) ?? [],
      ].join('|');

      if (
        !compiler
        || filetypes !== newFileTypes
        || localIdentName !== message.localIdentName
      ) {
        filetypes = newFileTypes;
        ({ localIdentName } = message);

        compiler = webpack({
          entry: '/index.js',
          experiments: { css: true },
          mode: 'development',
          module: {
            generator: {
              'css/module': {
                exportsOnly: true,
                localIdentName,

                // TODO: Should we expose some more of the available options?
                // https://webpack.js.org/guides/native-css/#generator-options
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
          },
        });

        compiler.inputFileSystem = fs;
        compiler.outputFileSystem = fs;
      }
    } break;
    case 'css': {
      const { css, path } = message;

      fs.mkdirSync(dirname(path), { recursive: true });
      fs.writeFileSync(path, css);
      fs.writeFileSync('/index.js', `import * as S from "${path}";console.log(S)`);

      compiler.run((error, stats) => {
        try {
          if (error || stats.hasErrors()) {
            postResult({
              error: error?.message || stats.toJson().errors,
              type: 'error',
            });
          } else {
            const cssModule = stats.compilation.modules.find(
              (m) => m.type === 'css/module',
            );

            const result /* Map */ = cssModule?.buildInfo?.cssData?.exports;

            postResult({
              mapEntries: Array.from(result?.entries()),
              type: 'result',
            });
          }
        } catch (error2) {
          postResult({
            error: error2.message,
            type: 'error',
          });
        }
      });
    } break;
    default:
  }
});
