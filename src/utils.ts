// This module provides a stable implementation of getLocalIdent(),
// and generateScopedName() functions, which may be used to override
// default classname generation algorithms of `css-loader` and this
// plugin, to be independent of internal `css-loader` changes that
// from time-to-time alter the output classnames without solid reasons.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// TODO: Double-check, if this dependency is really necessary?
import cssesc from 'cssesc';

// TODO: loader-utils repo is achived, and does not support all placeholders
// supported by modern Webpack (e.g. no [file]).
import { type LoaderInterpolateOption, interpolateName } from 'loader-utils';
import type { LoaderContext } from 'webpack';

import type { LocalIdentNameFunctionT } from './types';

const require = createRequire(import.meta.url);

/**
 * Normalizes file path to OS-independent format (adopted from css-loader).
 *
 * @ignore
 * @param {string} file
 * @returns {string}
 */
const normalizePath = (file: string) => (path.sep === '\\' ? file.replace(/\\/gu, '/') : file);

const filenameReservedRegex = /["*/:<>?\\|]/gu;

// eslint-disable-next-line no-control-regex
const reControlChars = /[\u0000-\u001F\u0080-\u009F]/gu;

const escapeLocalident = (localident: string) => cssesc(
  localident
  // For `[hash]` placeholder
    .replace(/^((-?\d)|--)/u, '_$1')
    .replace(filenameReservedRegex, '-')
    .replace(reControlChars, '-')
    .replace(/\./gu, '-'),
  { isIdentifier: true },
);

type PackageInfoT = {
  name: string;
  root: string;
};

const packageInfoCache: Record<string, PackageInfoT> = {};

/**
 * Returns the name of package containing the folder; i.e. it recursively looks
 * up from the folder for the closest package.json file, and returns the name in
 * that file. It also caches the results from previously fisited folders.
 *
 * @ignore
 * @param {string} folder
 * @returns {string}
 */
const getPackageInfo = (folder: string): PackageInfoT => {
  // TODO: Use Node's findPackageJSON()!
  let res = packageInfoCache[folder];
  if (!res) {
    const pp = path.resolve(folder, 'package.json');
    res = fs.existsSync(pp) ? {
      // eslint-disable-next-line import/no-dynamic-require
      name: (require(pp) as { name: string }).name,
      root: folder,
    } : getPackageInfo(path.resolve(folder, '..'));
    packageInfoCache[folder] = res;
  }

  return res;
};

function localIdentNameFactory(
  localIdentName: string,
): LocalIdentNameFunctionT {
  return ({ local, module: { resource } }) => {
    if (!local) throw Error('Missing local class name');
    if (!resource) throw Error('Missing resource path');

    const packageInfo = getPackageInfo(path.dirname(resource));
    const request = normalizePath(path.relative(packageInfo.root, resource));

    return escapeLocalident(interpolateName({
      resourcePath: resource,
    } as LoaderContext<LoaderInterpolateOption>, localIdentName, {
      content: `${packageInfo.name + request}\u0000${local}`,
      context: packageInfo.root,
    }).replace(/\[package\]/giu, packageInfo.name)
      .replace(/\[local\]/giu, local)
      .replace(/[@+/]/gu, '-'));
  };
}

export { localIdentNameFactory };
