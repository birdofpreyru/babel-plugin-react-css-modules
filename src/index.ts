import { dirname, resolve } from 'node:path';
import { URL } from 'node:url';

import type * as Babel from '@babel/core';
import babelPluginJsxSyntax from '@babel/plugin-syntax-jsx';
import type { NodePath } from '@babel/traverse';
import type { Identifier, Node, Program } from '@babel/types';

import attributeNameExists from './attributeNameExists';
import { createObjectExpression } from './createObjectExpression';
import createSpreadMapper from './createSpreadMapper';
import handleSpreadClassName from './handleSpreadClassName';
import replaceJsxExpressionContainer from './replaceJsxExpressionContainer';
import requireCssModule, { stopWorker } from './requireCssModule';
import { resolveStringLiteral } from './resolveStringLiteral';
import { optionsDefaults } from './schemas/optionsDefaults';
import { type OptionsT, optionsSchema } from './schemas/optionsSchema';

type StatsT = Babel.PluginPass<OptionsT>;

const getTargetResourcePath = (importedPath: string, stats: StatsT) => {
  const { filename } = stats.file.opts;
  if (!filename) throw Error('Internal error');
  const targetFileDirectoryPath = dirname(filename);

  if (importedPath.startsWith('.')) {
    return resolve(targetFileDirectoryPath, importedPath);
  }

  return new URL(import.meta.resolve(importedPath)).pathname;
};

const isFilenameExcluded = (filename: string, exclude: string) => filename.match(new RegExp(exclude, 'u'));

const notForPlugin = (importedPath: string, stats: StatsT) => {
  const extension = importedPath.lastIndexOf('.') > -1
    ? importedPath.slice(importedPath.lastIndexOf('.')) : null;

  if (extension !== '.css') {
    const { filetypes } = stats.opts;
    if (extension === null || !filetypes?.[extension]) return true;
  }

  const filename = getTargetResourcePath(importedPath, stats);

  if (stats.opts.exclude && isFilenameExcluded(filename, stats.opts.exclude)) {
    return true;
  }

  return false;
};

type StyleMapT = {
  importedHelperIndentifier: Identifier;
  styleModuleImportMap: Record<string, unknown>;
  styleModuleImportMapIdentifier: Identifier;
};

export default ({
  types,
}: typeof Babel): Babel.PluginObject<Babel.PluginPass<OptionsT>> => {
  const styleMapsForFileByName: Record<string, StyleMapT> = {};
  const styleMapsForFileByPath: Record<string, Record<string, unknown>> = {};

  let skip = false;

  const setupFileForRuntimeResolution = (
    path: NodePath,
    filename: string,
  ) => {
    const programPath = path.findParent(
      (parentPath) => parentPath.isProgram(),
    ) as NodePath<Program>;

    const styleMap = styleMapsForFileByName[filename];
    if (!styleMap) throw Error('Internal error');

    styleMap.importedHelperIndentifier = programPath.scope.generateUidIdentifier('getClassName');
    styleMap.styleModuleImportMapIdentifier = programPath.scope.generateUidIdentifier('styleModuleImportMap');

    programPath.unshiftContainer(
      'body',
      types.importDeclaration(
        [types.importDefaultSpecifier(styleMap.importedHelperIndentifier)],
        types.stringLiteral('@dr.pogodin/babel-plugin-react-css-modules/getClassName'),
      ),
    );

    const firstNonImportDeclarationNode = programPath.get('body').find((node) => !types.isImportDeclaration(node as Node));

    if (!firstNonImportDeclarationNode) throw Error('Internal error');
    firstNonImportDeclarationNode.insertBefore(
      types.variableDeclaration(
        'const',
        [
          types.variableDeclarator(
            types.cloneNode(styleMap.styleModuleImportMapIdentifier),
            createObjectExpression(styleMap.styleModuleImportMap),
          ),
        ],
      ),
    );
  };

  /**
   * Adds Webpack "hot module accept" code "a-la CommonJS" style,
   * i.e. using module.hot.
   * @param {object} path
   */
  const addCommonJsWebpackHotModuleAccept = (
    path: NodePath,
    importedPath: string,
  ) => {
    const test = types.memberExpression(types.identifier('module'), types.identifier('hot'));
    const consequent = types.blockStatement([
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(
            types.memberExpression(types.identifier('module'), types.identifier('hot')),
            types.identifier('accept'),
          ),
          [
            types.stringLiteral(importedPath),
            types.functionExpression(null, [], types.blockStatement([
              types.expressionStatement(
                types.callExpression(
                  types.identifier('require'),
                  [types.stringLiteral(importedPath)],
                ),
              ),
            ])),
          ],
        ),
      ),
    ]);

    const programPath = path.findParent((parentPath) => parentPath.isProgram());
    if (programPath?.type !== 'Program') throw Error('Internal error');

    const firstNonImportDeclarationNode = programPath.get('body').find(
      (node) => !types.isImportDeclaration(node as Node),
    );

    const hotAcceptStatement = types.ifStatement(test, consequent);

    if (firstNonImportDeclarationNode) {
      firstNonImportDeclarationNode.insertBefore(hotAcceptStatement);
    } else {
      programPath.pushContainer('body', hotAcceptStatement);
    }
  };

  /**
   * Adds Webpack "hot module accept" code "a-la ESM" style,
   * i.e. using import.meta.webpackHot
   * @param {object} path
   */
  const addEsmWebpackHotModuleAccept = (
    path: NodePath,
    importedPath: string,
  ) => {
    const test = types.memberExpression(
      types.memberExpression(
        types.identifier('import'),
        types.identifier('meta'),
      ),
      types.identifier('webpackHot'),
    );
    const consequent = types.blockStatement([
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(
            types.memberExpression(
              types.memberExpression(
                types.identifier('import'),
                types.identifier('meta'),
              ),
              types.identifier('webpackHot'),
            ),
            types.identifier('accept'),
          ),
          [
            types.stringLiteral(importedPath),
            types.functionExpression(null, [], types.blockStatement([
              types.expressionStatement(
                types.callExpression(
                  types.identifier('require'),
                  [types.stringLiteral(importedPath)],
                ),
              ),
            ])),
          ],
        ),
      ),
    ]);

    const programPath = path.findParent((parentPath) => parentPath.isProgram());
    if (programPath?.type !== 'Program') throw Error('Internal error');

    const firstNonImportDeclarationNode = programPath.get('body').find((node) => !types.isImportDeclaration(node));

    const hotAcceptStatement = types.ifStatement(test, consequent);

    if (firstNonImportDeclarationNode) {
      firstNonImportDeclarationNode.insertBefore(hotAcceptStatement);
    } else {
      programPath.pushContainer('body', hotAcceptStatement);
    }
  };

  const loadStyleMap = (
    name: string,
    importedPath: string,
    resolvedPath: string,
    path: NodePath,
    stats: StatsT,
  ) => {
    const {
      file: { opts: { filename } },
      opts: {
        context,
        filetypes = {},
        localIdentName,
        transform,
        uniqueName,
      },
    } = stats;

    if (!filename) throw Error('Missing filename');

    const styleMapsForFile = styleMapsForFileByName[filename];
    if (!styleMapsForFile) throw Error('Missing style maps for file');

    const mapsByName = styleMapsForFile.styleModuleImportMap;
    let styleMap = mapsByName[name];

    // In case it was loaded under a different name before.
    if (!styleMap) {
      const styleMapsByPath = styleMapsForFileByPath[filename];
      if (!styleMapsByPath) throw Error('Missing style maps for file');

      styleMap = styleMapsByPath[importedPath];
      mapsByName[name] = styleMap;
    }

    // Loading a map for the first time.
    if (!styleMap) {
      styleMap = requireCssModule(resolvedPath, {
        context,
        filetypes,
        localIdentName,
        transform,
        uniqueName,
      });
      mapsByName[name] = styleMap;

      const styleMapsByPath = styleMapsForFileByPath[filename];
      if (!styleMapsByPath) throw Error('Missing style maps bucket');

      styleMapsByPath[importedPath] = styleMap;

      const { replaceImport, webpackHotModuleReloading } = stats.opts;

      // replaceImport flag means we target server-side environment,
      // thus client-side Webpack's HMR code should not be injected.
      if (!replaceImport) {
        if (webpackHotModuleReloading === 'commonjs') {
          addCommonJsWebpackHotModuleAccept(path, importedPath);
        } else if (webpackHotModuleReloading) {
          addEsmWebpackHotModuleAccept(path, importedPath);
        }
      }
    }

    return styleMap;
  };

  return {
    inherits: babelPluginJsxSyntax,
    post() {
      stopWorker();
    },
    visitor: {
      // const styles = require('./styles.css');
      CallExpression(path, stats) {
        try {
          const { arguments: args, callee } = path.node;
          if (skip || !('name' in callee) || callee.name !== 'require' || !args.length
            || !types.isStringLiteral(args[0])) return;

          const importedPath = args[0].value;
          if (notForPlugin(importedPath, stats)) return;

          const targetResourcePath = getTargetResourcePath(importedPath, stats);

          let styleImportName: string;
          if (path.parentPath.type === 'VariableDeclarator') {
            if (path.parentPath.node.id.type !== 'Identifier') {
              throw Error('Unexpected ID type');
            }
            styleImportName = path.parentPath.node.id.name;
          } else styleImportName = importedPath;

          const styleMap = loadStyleMap(
            styleImportName,
            importedPath,
            targetResourcePath,
            path,
            stats,
          );

          if (stats.opts.replaceImport) {
            if (isAssigned) {
              path.replaceWith(
                createObjectExpression(types, styleMap),
              );
            } else path.remove();
          } else if (stats.opts.removeImport) {
            path.remove();
          }
        } catch (error) {
          stopWorker();
          throw error;
        }
      },

      // All these are supposed to be supported by this visitor:
      // import styles from './style.css';
      // import * as styles from './style.css';
      // import { className } from './style.css';
      // import Style, { className } from './style.css';
      ImportDeclaration(path, stats): void {
        try {
          const importedPath = path.node.source.value;
          if (skip || notForPlugin(importedPath, stats)) return;

          const targetResourcePath = getTargetResourcePath(importedPath, stats);

          let styleImportName: string;
          const { specifiers } = path.node;

          const guardStyleImportNameIsNotSet = () => {
            if (styleImportName) {
              // If this throws, it means we are missing something in our logic
              // below, and although it might look functional, it does not produce
              // determenistic style import selection.
              // eslint-disable-next-line no-console
              console.warn('Please report your use case. https://github.com/birdofpreyru/babel-plugin-react-css-modules/issues/new?title=Unexpected+use+case.');
              throw Error('Style import name is already selected');
            }
          };

          for (let i = 0; i < specifiers.length; ++i) {
            const specifier = specifiers[i];
            switch (specifier.type) {
              // import Style from './style.css';
              case 'ImportDefaultSpecifier':
                guardStyleImportNameIsNotSet();
                styleImportName = specifier.local.name;
                break;

              // import * as Style from './style.css';
              case 'ImportNamespaceSpecifier':
                guardStyleImportNameIsNotSet();
                styleImportName = specifier.local.name;
                break;

              // These are individual class names in the named import:
              // import { className } from './style.css';
              // we just ignore them, falling back to either the default
              // import, or the imported path.
              case 'ImportSpecifier':
                break;

              default:
                // eslint-disable-next-line no-console
                console.warn('Please report your use case. https://github.com/birdofpreyru/babel-plugin-react-css-modules/issues/new?title=Unexpected+use+case.');

                throw new Error('Unexpected use case.');
            }
          }

          // Fallback for anonymous style import:
          // import './style.css';
          if (styleImportName === undefined) styleImportName = importedPath;

          const styleMap = loadStyleMap(
            styleImportName,
            importedPath,
            targetResourcePath,
            path,
            stats,
          );

          if (stats.opts.replaceImport) {
            const variables = [];

            for (let i = 0; i < specifiers.length; ++i) {
              const specifier = specifiers[i];
              switch (specifier.type) {
                case 'ImportDefaultSpecifier':
                case 'ImportNamespaceSpecifier':
                  variables.push(
                    types.variableDeclarator(
                      types.identifier(specifier.local.name),
                      createObjectExpression(types, styleMap),
                    ),
                  );
                  break;
                case 'ImportSpecifier': {
                  const value = styleMap[specifier.imported.name];
                  variables.push(
                    types.variableDeclarator(
                      types.identifier(specifier.local.name),
                      value === undefined
                        ? undefined : types.stringLiteral(value),
                    ),
                  );
                  break;
                }
                default:
                  throw Error('Unsupported kind of import');
              }
            }

            if (variables.length) {
              path.replaceWith(
                types.variableDeclaration('const', variables),
              );
            } else path.remove();
          } else if (stats.opts.removeImport) {
            path.remove();
          }
        } catch (error) {
          stopWorker();
          throw error;
        }
      },

      JSXElement(path, stats) {
        try {
          if (skip) {
            return;
          }

          const { filename } = stats.file.opts;
          if (!filename) throw Error('Missing filename');

          if (
            stats.opts.exclude
            && isFilenameExcluded(filename, stats.opts.exclude)
          ) return;

          let { attributeNames } = optionsDefaults;

          if (stats.opts.attributeNames) {
            attributeNames = {
              ...attributeNames,
              ...stats.opts.attributeNames,
            };
          }

          const attributes = path.node.openingElement.attributes
            .filter((attribute) => {
              if (!('name' in attribute)) return false;

              if (typeof attribute.name.name !== 'string') {
                throw Error('Internal error');
              }

              return typeof attributeNames[attribute.name.name] === 'string';
            });

          if (attributes.length === 0) {
            return;
          }

          const {
            autoResolveMultipleImports
              = optionsDefaults.autoResolveMultipleImports,
            handleMissingStyleName = optionsDefaults.handleMissingStyleName,
          } = stats.opts || {};

          const spreadMap = createSpreadMapper(path, stats);

          attributes.forEach((attribute) => {
            const destinationName = attributeNames[attribute.name.name];

            const options = {
              autoResolveMultipleImports,
              handleMissingStyleName,
            };

            if (types.isStringLiteral(attribute.value)) {
              resolveStringLiteral(
                path,
                styleMapsForFileByName[filename].styleModuleImportMap,
                attribute,
                destinationName,
                options,
              );
            } else if (types.isJSXExpressionContainer(attribute.value)) {
              if (!styleMapsForFileByName[filename].importedHelperIndentifier) {
                setupFileForRuntimeResolution(path, filename);
              }

              replaceJsxExpressionContainer(
                types,
                path,
                attribute,
                destinationName,
                styleMapsForFileByName[filename].importedHelperIndentifier,
                types.cloneNode(
                  styleMapsForFileByName[filename]
                    .styleModuleImportMapIdentifier,
                ),
                options,
              );
            }

            if (spreadMap[destinationName]) {
              handleSpreadClassName(
                path,
                destinationName,
                spreadMap[destinationName],
              );
            }
          });
        } catch (error) {
          stopWorker();
          throw error;
        }
      },

      Program(path, stats): void {
        try {
          optionsSchema.parse(stats.opts);

          const { filename } = stats.file.opts;

          styleMapsForFileByName[filename] = {
            styleModuleImportMap: {},
          };
          styleMapsForFileByPath[filename] = {};

          if (stats.opts.skip && !attributeNameExists(path, stats)) {
            skip = true;
          }
        } catch (error) {
          stopWorker();
          throw error;
        }
      },
    },
  };
};
