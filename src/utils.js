// This module provides a stable implementation of getLocalIdent(),
// and generateScopedName() functions, which may be used to override
// default classname generation algorithms of `css-loader` and this
// plugin, to be independent of internal `css-loader` changes that
// from time-to-time alter the output classnames without solid reasons.

/* global require */

import fs from 'fs';
import path from 'path';
import cssesc from 'cssesc';
import {
  interpolateName,
} from 'loader-utils';

/**
 * Normalizes file path to OS-independent format (adopted from css-loader).
 *
 * @ignore
 * @param {string} file
 * @returns {string}
 */
const normalizePath = (file) => (path.sep === '\\' ? file.replace(/\\/gu, '/') : file);

const filenameReservedRegex = /["*/:<>?\\|]/gu;

// eslint-disable-next-line no-control-regex
const reControlChars = /[\u0000-\u001F\u0080-\u009F]/gu;

const escapeLocalident = (localident) => cssesc(
  localident
  // For `[hash]` placeholder
    .replace(/^((-?\d)|--)/u, '_$1')
    .replace(filenameReservedRegex, '-')
    .replace(reControlChars, '-')
    .replace(/\./gu, '-'),
  { isIdentifier: true },
);

/**
 * Returns the name of package containing the folder; i.e. it recursively looks
 * up from the folder for the closest package.json file, and returns the name in
 * that file. It also caches the results from previously fisited folders.
 *
 * @ignore
 * @param {string} folder
 * @returns {string}
 */
const getPackageInfo = (folder) => {
  let res = getPackageInfo.cache[folder];
  if (!res) {
    const pp = path.resolve(folder, 'package.json');
    res = fs.existsSync(pp) ? {
      // eslint-disable-next-line import/no-dynamic-require
      name: require(pp).name,
      root: folder,
    } : getPackageInfo(path.resolve(folder, '..'));
    getPackageInfo.cache[folder] = res;
  }

  return res;
};

getPackageInfo.cache = {};

const getLocalIdent = (
  { resourcePath },
  localIdentName,
  localName,
  options = {},
) => {
  const packageInfo = getPackageInfo(path.dirname(resourcePath));
  const request = normalizePath(path.relative(packageInfo.root, resourcePath));

  return interpolateName({
    resourcePath,
  }, localIdentName, {
    ...options,
    content: `${packageInfo.name + request}\u0000${localName}`,
    context: packageInfo.root,
  }).replace(/\[package\]/giu, packageInfo.name)
    .replace(/\[local\]/giu, localName)
    .replace(/[@+/]/gu, '-');
};

const generateScopedNameFactory = (localIdentName) => (
  localName,
  assetPath,
) => escapeLocalident(
  getLocalIdent(
    { resourcePath: assetPath },
    localIdentName,
    localName,
    {},
  ),
);

export {
  generateScopedNameFactory,
  getLocalIdent,
};
