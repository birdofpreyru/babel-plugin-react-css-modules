# Babel Plugin: React CSS Modules

[![Latest NPM Release](https://img.shields.io/npm/v/@dr.pogodin/babel-plugin-react-css-modules.svg)](https://www.npmjs.com/package/@dr.pogodin/babel-plugin-react-css-modules)
[![NPM monthly downloads](https://img.shields.io/npm/dm/@dr.pogodin/babel-plugin-react-css-modules.svg)](https://www.npmjs.com/package/@dr.pogodin/babel-plugin-react-css-modules)
[![CircleCI](https://dl.circleci.com/status-badge/img/gh/birdofpreyru/babel-plugin-react-css-modules/tree/master.svg?style=shield)](https://app.circleci.com/pipelines/github/birdofpreyru/babel-plugin-react-css-modules)
[![GitHub Repo stars](https://img.shields.io/github/stars/birdofpreyru/babel-plugin-react-css-modules?style=social)](https://github.com/birdofpreyru/babel-plugin-react-css-modules)
[![Dr. Pogodin Studio](https://raw.githubusercontent.com/birdofpreyru/babel-plugin-react-css-modules/master/.README/logo-dr-pogodin-studio.svg)](https://dr.pogodin.studio/docs/babel-plugin-react-css-modules)


[Babel] plugin for advanced [CSS modules] support in [React]:

- It transforms `styleName` attribute of JSX components into `className` using
  compile-time CSS module resolution, allowing for a cleaner use of CSS modules
  in React.
- For server-side rendering (SSR) scenarios it can replace named stylesheet
  imports by classname mapping objects, and remove anonymous stylesheet imports.

[![Sponsor](https://raw.githubusercontent.com/birdofpreyru/babel-plugin-react-css-modules/master/.README/sponsor.svg)](https://github.com/sponsors/birdofpreyru)

### [Contributors](https://github.com/birdofpreyru/babel-plugin-react-css-modules/graphs/contributors)
[<img width=36 src="https://avatars.githubusercontent.com/u/313363?s=36&v=4" />](https://github.com/praveenpuglia)
[<img width=36 src="https://avatars.githubusercontent.com/u/2173299?s=36&v=4" />](https://github.com/d-oliveros)
[<img width=36 src="https://avatars.githubusercontent.com/u/22940470?s=36&v=4" />](https://github.com/moonlitusun)
[<img width=36 src="https://avatars.githubusercontent.com/u/53335451?s=36&v=4" />](https://github.com/pturchik)
[<img width=36 src="https://avatars.githubusercontent.com/u/20144632?s=36&v=4" />](https://github.com/birdofpreyru)

## Content

- [Usage examples](#usage-examples)
- [Installation](#installation)
  - [React Native](#react-native)
- [Migration v7 &rArr; v8]
- [Configuration](#configuration)
  - [Plugin options](#plugin-options)
  - [Configurate syntax loaders]
  - [Custom Attribute Mapping]
- [Under the hood](#under-the-hood)
  - [How does it work?](#how-does-it-work)
  - [Project history](#project-history)

## Usage Examples

Assuming `style.css` in the following examples is compiled as CSS Module.

**Without this plugin**
```jsx
import S from './styles.css';

export default function Component() {
  return (
    <div className={S.container}>
      <h1 className={S.title}>Example</div>
      <p styleName={S.text}>Sample text paragraph.</p>
      <p className={`${S.text} ${S.special}`}>
        Sample text paragraph with special style.
      </p>
    </div>
  );
}
```

**With this plugin**
```jsx
import './styles.css';

export default function Component() {
  return (
    <div styleName="container">
      <h1 styleName="title">Example</div>
      <p styleName="text">Sample text paragraph.</p>
      <p styleName="text special">
        Sample text paragraph with special style.
      </p>
    </div>
  );
}
```

**With this plugin and multiple stylesheets**

Assuming:
- Styles `container`, `title`, and `text` are defined in `styles-01.css`.
- Style `special` is defined in `styles-02.css`.
- The plugin's `autoResolveMultipleImports` option is enabled (default).

```jsx
import './styles-01.css';
import './styles-02.css';

export default function Component() {
  return (
    <div styleName="container">
      <h1 styleName="title">Example</div>
      <p styleName="text">Sample text paragraph.</p>
      <p styleName="text special">
        Sample text paragraph with special style.
      </p>
    </div>
  );
}
```
If both files, `styles-01.css` and `styles-02.css` contain styles with the same
names, thus making auto resolution impossible, this plugin allows explicit
stylesheet prefixes:
```jsx
import S1 from './styles-01.css';
import S2 from './styles-02.css';

export default function Component() {
  return (
    <div styleName="S1.container">
      <h1 styleName="S1.title">Example</div>
      <p styleName="S1.text">Sample text paragraph.</p>
      <p styleName="S1.text S2.special">
        Sample text paragraph with special style.
      </p>
    </div>
  );
}
```

**With this plugin and runtime resolution**

```jsx
import './styles-01.css';
import './styles-02.css';

export default function Component({ special }) {
  let textStyle = 'text';
  if (special) textStyle += ' special';

  return (
    <div styleName="container">
      <h1 styleName="title">Example</div>
      <p styleName={textStyle}>Sample text paragraph.</p>
      <p styleName={textStyle}>
        Sample text paragraph with special style.
      </p>
    </div>
  );
}
```
In the case when the exact style value is not known at the compile time, like in
this example, the plugin will inject necessary code to correctly resolve the
`styleName` at runtime (which is somewhat less performant, but otherwise works
fine).

**SSR scenario**

Consider such component, which uses a named stylesheet import in order to use it
in some other ways, beside simple styling, _e.g._ to also display the classname
mapping:
```jsx
import S from './style.css';

export default function Component() {
  return (
    <div styleName="container">
      {JSON.stringify(S)}
    </div>
  )
}
```

While by default this plugin transforms it into (leaving it to the Webpack
to handle `./style.scss` import for the actual CSS bundling, and leaving
a correct JS in place of it):
```jsx
import S from './style.css';

export default function Component() {
  return (
    <div className="12345">
      {JSON.stringify(S)}
    </div>
  )
}
```

For server-side environment, if you don't compile server-side code with Webpack,
you'll need to replace `./style.css` with valid JS code. That is exactly what
this plugin does with `replaceImport` option enabled, it outputs:
```jsx
const S = {
  container: '12345',
  // Other stylesheet keys, if any.
};

export default function Component() {
  return (
    <div className="12345">
      {JSON.stringify(S)}
    </div>
  )
}
```

**CommonJS require() support**

The plugin works the same with `require('./style.css')` CSS imports.

## Installation

- The core CSS Modules functionality should be enabled and configured elsewhere
  in your React project:
  - With [Create React App] see
    [Adding a CSS Modules Stylesheet](https://create-react-app.dev/docs/adding-a-css-modules-stylesheet).
  - With bare [Webpack] see [Native CSS].
  - With other frameworks refer to their documentation.

- Install this plugin as a direct dependency (in edge-cases not allowing for
  a compile-time `styleName` resolution, the plugin falls back to the runtime
  resolution).
  ```
  npm install --save @dr.pogodin/babel-plugin-react-css-modules
  ```

- Install Webpack at least as a dev dependency:
  ```
  npm install --save-dev webpack
  ```

- Add the plugin to Babel configuration:
  ```js
  {
    "plugins": [
      ["@dr.pogodin/react-css-modules", {
        // The default "localIdentName" values in Webpack are
        // "[uniqueName]-[id]-[local]" (dev) / "[fullhash]" (prod),
        // see: https://webpack.js.org/guides/native-css/#generator-options.
        // It is highly recommended to explicitly specify the same value
        // both here, and in your Webpack config(s), including the hash
        // length (the last digit in the templace below).
        "generateScopedName": "[hash:base64:6]"

        // See below for all valid options.
      }]
    ]
  }
  ```

- The `generateScopedName` option value MUST match `localIdentName` option of
  Webpack, to ensure both Webpack and this plugin generate matching class
  names. The same goes for other options impacting class names
  (_e.g._ the default length of hashes generated by Webpack, which is used
  if you don't specify the hash length explicitly in `localIdentName` hash
  placeholders).

### React Native

If you'd like to get this working in React Native, you're going to have to allow
custom import extensions, via a `rn-cli.config.js` file:

```js
module.exports = {
  getAssetExts() {
    return ["scss"];
  }
}
```

Remember, also, that the bundler caches things like plugins and presets. If you
want to change your `.babelrc` (to add this plugin) then you'll want to add the
`--reset-cache` flag to the end of the package command.

## Migration v7 &rArr; v8
[Migration v7 &rArr; v8]: #migration-v7--v8

1.  Migrate your CSS processing from [css-loader] to Webpack's [Native CSS].

2.  Make sure the `generateScopedName` option of this plugin is set to a string,
    matching the `localIdentName` option in the Webpack's settings for CSS modules.
    It is recommended to set both explicitly,
    _e.g._ `[file]__[local]__[fullhash:base64:6]` for development,
    and `[fullhash:base64:6]` for production builds.

3.  When Webpack generates hashes for the output class names, it always includes
    `[file]` (relative to the Webpack context) and `[uniqueName]` into the hashed
    data (even if they are not a part of the `localIdentName` string). Explicitly
    set `context` and `uniqueName` options of this plugin to the values matching
    Webpack's ones, and double-check that you get matching class names in your
    output CSS and JS code, as well as between client- and server-side builds
    (in case you do server-side rendering).

## Configuration

### Plugin Options

These are valid plugin options. All are optional, but the overall configuration
should be compatible with that of Webpack's [Native CSS] settings, thus defaults
may not work for you.

- `context` &mdash; **string** &mdash; Must match webpack
  [`context`](https://webpack.js.org/configuration/entry-context/#context)
  configuration. Defaults `process.cwd()`.

- `exclude` - **string** - A RegExp that will exclude otherwise included files
  _e.g._, to exclude all styles from node_modules: `exclude: 'node_modules'`.
- `filetypes` - [Configurate syntax loaders] like sugarss, LESS and SCSS,
  and extra plugins for them.

- `generateScopedName` - **string** - Allows to customize the exact
  `styleName` to `className` conversion algorithm. For details see
  [Native CSS].
  Defaults `[path]___[name]__[local]___[fullhash:base64:5]`.

- `replaceImport` - **boolean** - Replaces / removes stylesheet imports for
  server-side rendering purposes. [See details below](#server-side-rendering).
  Defaults **false**.

- `handleMissingStyleName` - **string** - Determines what should be done for
  undefined CSS modules (using a `styleName` for which there is no CSS module
  defined). Valid values: `"throw"`, `"warn"`, `"ignore"`. Setting this option
  to `"ignore"` is equivalent to setting `errorWhenNotFound: false` in
  [react-css-modules](https://github.com/birdofpreyru/react-css-modules#errorwhennotfound). Defaults `"throw"`.
- `attributeNames` - [Custom Attribute Mapping]
- `skip` - **boolean** - Whether to apply plugin if no matching `attributeNames`
  found in the file. Defaults **false**.
- [transform] - **function** - If provided, each CSS source loaded by
  the plugin will be passed through this function, alongside its path,
  and this plugin's options, and the output of this function will be used
  in place of the original CSS.
- `autoResolveMultipleImports` - **boolean** - Allows multiple anonymous imports if
  `styleName` is only in one of them. Defaults **true**.

- `uniqueName` &mdash; **string** &mdash; Must match Webpack's
  [output.uniqueName](https://webpack.js.org/configuration/output/#outputuniquename)
  configuration. Undefined by default (and does not attempt to match
  the Webpack's defaults).

### Deprecated Plugin Options
- ~~`removeImport` - **boolean**~~ &mdash; Use `replaceImport` option instead.
- ~~`webpackHotModuleReloading` - **boolean** | `"commonjs"`~~ &mdash;
  I believe, as of 2026 there is no reason for this plugin to support
  HMR code injection &mdash; the Webpack / framework should handle it
  on its own.

### Configurate syntax loaders

To add support for different CSS syntaxes (e.g. SCSS), perform the following
two steps:

1.  Add the [postcss syntax loader](https://github.com/postcss/postcss#syntaxes)
    as a development dependency:

    ```bash
    npm install postcss-scss --save-dev
    ```

2.  Add a `filetypes` syntax mapping to the Babel plugin configuration.
    For example for SCSS:

    ```json
    "filetypes": {
      ".scss": {
        "syntax": "postcss-scss"
      }
    }
    ```

    And optionally specify extra plugins:

    ```json
    "filetypes": {
      ".scss": {
        "syntax": "postcss-scss",
        "plugins": [
          "postcss-nested"
        ]
      }
    }
    ```

    > NOTE: [`postcss-nested`](https://github.com/postcss/postcss-nested)
      is added as an extra plugin for demonstration purposes only. It's not
      needed with [`postcss-scss`](https://github.com/postcss/postcss-scss)
      because SCSS already supports nesting.

    Postcss plugins can have options specified by wrapping the name and an options object in an array inside your config: 

    ```json
      "plugins": [
        ["postcss-import-sync2", {
          "path": ["src/styles", "shared/styles"]
        }],
        "postcss-nested"
      ]
    ```

### transform
```js
function transform(cssSource, cssSourceFilePath, pluginOptions): string
```
The transform function, if provided as the `transform` option of this plugin,
will be called for each loaded CSS source with three arguments:
- `cssSource` - **string** - The loaded CSS code.
- `cssSourceFilePath` - **string** - The path of loaded CSS file.
- `pluginOptions` - **object** - The options set for this plugin.

It should return a string, the actual CSS code to use.

### Custom Attribute 

You can set your own attribute mapping rules using the `attributeNames` option.

It's an object, where keys are source attribute names and values are destination
attribute names.

For example, the
[&lt;NavLink&gt;](https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/docs/api/NavLink.md)
component from [React Router](https://github.com/ReactTraining/react-router)
has an `activeClassName` attribute to accept an additional class name. You can
set `"attributeNames": { "activeStyleName": "activeClassName" }` to transform it.

The default `styleName` -> `className` transformation **will not** be affected
by an `attributeNames` value without a `styleName` key. Of course you can use
`{ "styleName": "somethingOther" }` to change it, or use `{ "styleName": null }`
to disable it.

### Server-Side Rendering
If `replaceImport` flag is set, this plugin will remove or replace original
stylesheet imports, which is needed for server-side rendering:

```js
// Anonymous imports are removed from the code:
import 'path/to/style.css';

// Default and named imports are replaced in the following manner:

// Before:
import styles, {
  className,
  otherClassName as alias,
} from 'path/to/style.css';

// After:
const styles = {
  className: 'generatedClassName',
  otherClassName: 'otherGeneratedClassName',
},
className = 'generatedClassName',
alias = 'otherGeneratedClassName';

// Also this kind of import:
import * as style from 'path/to/style.css';

// is replaced by:
const style = {
  className: 'generatedClassName',
  otherClassName: 'otherGeneratedClassName',
};
```

## Under the hood

### How does it work?

This plugin does the following:
1.  Builds index of all stylesheet imports per file (imports of files with
    `.css` or `.scss` extension).
2.  Uses [postcss] and [Webpack] to parse the matching
    CSS files into a lookup of CSS module references.
3.  Iterates through all
    [JSX](https://facebook.github.io/react/docs/jsx-in-depth.html)
    element declarations.
4.  Parses the `styleName` attribute value into anonymous and named CSS module
    references.
5.  Finds the CSS class name matching the CSS module reference:
    * If `styleName` value is a string literal, generates a string literal value.
    * If `styleName` value is a
      [`jSXExpressionContainer`](https://babeljs.io/docs/en/next/babel-types.html#jsxexpressioncontainer),
      uses a helper function ([`getClassName`](./src/getClassName.js))
      to construct the `className` value at the runtime.
6.  Removes the `styleName` attribute from the element.
7.  Appends the resulting `className` to the existing `className` value
    (creates `className` attribute if one does not exist).

### Project history

- It started in 2020 as a fork of the original 
  [babel-plugin-react-css-modules](https://www.npmjs.com/package/babel-plugin-react-css-modules) plugin,
  abandoned by its author since about a year before, as new releases of
  [Webpack] and [css-loader] were incompatible with the original plugin
  and required numerous upgrades.

  NOTE: The owner of the original package removed all announcements of this
  fork from his repository, and blocked me from commenting there, that's why
  you don't see any mentions of this fork there.

- Since then this plugin receives regular maintenance,
  and got some new features.

- In 2026 its v8 dropped dependency on (compatibility with) then deprecated
  [css-loader], and now aims on compatibility with [Webpack]'s [Native CSS]
  processing.

<!-- Reusable links -->

[Babel]: https://babeljs.io
[birdofpreyru]: https://github.com/birdofpreyru
[css-loader]: https://www.npmjs.com/package/css-loader
[CSS modules]: https://github.com/css-modules/css-modules
[Create React App]: https://create-react-app.dev
[Native CSS]: https://webpack.js.org/guides/native-css
[postcss]: https://github.com/postcss/postcss
[React]: https://reactjs.org
[Webpack]: https://webpack.js.org

[FiletypesConfiguration]: #filetypesconfiguration
[GenerateScopedNameConfiguration]: #generatescopednameconfiguration
[Configurate syntax loaders]: #configurate-syntax-loaders
[Custom Attribute Mapping]: #custom-attribute-mapping
[transform]: #transform
