# Babel Plugin: React CSS Modules

[![Latest NPM Release](https://img.shields.io/npm/v/@dr.pogodin/babel-plugin-react-css-modules.svg)](https://www.npmjs.com/package/@dr.pogodin/babel-plugin-react-css-modules)
[![NPM monthly downloads](https://img.shields.io/npm/dm/@dr.pogodin/babel-plugin-react-css-modules.svg)](https://www.npmjs.com/package/@dr.pogodin/babel-plugin-react-css-modules)
[![CircleCI](https://dl.circleci.com/status-badge/img/gh/birdofpreyru/babel-plugin-react-css-modules/tree/master.svg?style=shield)](https://app.circleci.com/pipelines/github/birdofpreyru/babel-plugin-react-css-modules)
[![GitHub Repo stars](https://img.shields.io/github/stars/birdofpreyru/babel-plugin-react-css-modules?style=social)](https://github.com/birdofpreyru/babel-plugin-react-css-modules)
[![Dr. Pogodin Studio](https://raw.githubusercontent.com/birdofpreyru/babel-plugin-react-css-modules/master/.README/logo-dr-pogodin-studio.svg)](https://dr.pogodin.studio/docs/babel-plugin-react-css-modules)


[Babel] plugin for advanced [CSS modules] support in [React]:

- It transforms `styleName` attributes of JSX components into `className` using
  compile-time CSS module resolution, allowing for a cleaner use of CSS modules
  in React.

- For server-side rendering (SSR) it can replace named stylesheet imports
  by class name mapping objects, and remove anonymous stylesheet imports.

This plugin is a fork and further evolution of the original
[babel-plugin-react-css-modules] (the original `babel-plugin-react-css-modules`
has been abandoned by its owner since 2019, and it does not work with the modern
Webpack versions).

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
  - [React][Installation for React]
  - [React Native](#react-native)
  - [Migration v7 &rArr; v8]
- [Configuration](#configuration)
  - [Plugin options](#plugin-options)
  - [Configurate syntax loaders]
  - [Custom Attribute Mapping]
- [Under the hood](#under-the-hood)
  - [How does it work?](#how-does-it-work)
  - [Project history](#project-history)
  - [`css-loader` compatibility](#css-loader-compatibility)

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

While by default this plugin transforms it into the following code (leaving it
to Webpack to handle `./style.scss` import for the actual CSS bundling,
and to generate the correct JS output):
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
### React
[Installation for React]: #react

- The core CSS Modules functionality should be enabled and configured elsewhere
  in your React project:
  - With bare Webpack see [Native CSS].
  - With other frameworks refer to their corresponding documentation.

- Install this plugin as a direct dependency (in the edge-cases,
  when the compile-time `styleName` resolution is impossible, this plugin falls
  back to the runtime resolution).
  ```sh
  npm install --save @dr.pogodin/babel-plugin-react-css-modules
  ```

- Install Webpack at least as a development dependency:
  ```sh
  npm install --save-dev webpack
  ```

- Add this plugin to Babel configuration:
  ```json
  {
    "plugins": [
      ["@dr.pogodin/react-css-modules", {
        "context": "/your/webpack/compilation/context",
        "localIdentName": "[fullhash:base64:6]",
        "uniqueName": "output.uniqueName used by Webpack",
      }]
    ]
  }
  ```

  **BEWARE**:

  - The `localIdentName` option value MUST match the `localIdentName` option of
    the Webpack's CSS generator. By default, Webpack uses `[uniqueName]-[id]-[local]`
    for development builds, and `[fullhash]` for production builds
    (see: https://webpack.js.org/guides/native-css/#generator-options);
    we recommend to explicitly set the same, matching values both in this
    plugin's and in the Webpack generator's configurations, including
    the hash digest kind & length (_e.g._ `[fullhash:base64:6]`).

  - The `fullhash` calculated by Webpack includes the path of CSS file,
    relative to the Webpack's compilation `context`, and the [output.uniqueName]
    value. Be sure to set `context` and `uniqueName` settings of this plugin
    to the appropriate values, and double-check the class names generated by
    Webpack, and by this plugin do match.

  - Alternatively, this plugin provides a simplified, stable implementation
    for `getLocalIdent` function (taken from a selected old version of
    [css-loader]). It resolves CSS file paths (for `[file]`, `[path]`, _etc._
    placeholders, and inside hashes) relative to the closest `package.json`
    file; it does not factor `uniqueName` into the hash, and it supports
    an additional `package` placeholder, which is substituded by the `name`
    value from the closest `package.json` &mdash; all these come handy for
    compilation of libraries.

    You can use this `getLocalIdent` function (its factory, to be precise) like
    this: 

    **Within Webpack Config**
    ```ts
    import { localIdentNameFactory } from '@dr.pogodin/babel-plugin-react-css-modules/utils';

    export {
      module: {
        generator: {
          'css/module': {
            localIdentName: localIdentNameFactory('fullhash:base64:6'),
          },
        },
      },
    };
    ```

    **Within Babel Config**
    ```ts
    import { localIdentNameFactory } from '@dr.pogodin/babel-plugin-react-css-modules/utils';

    export {
      plugins: [
        ["@dr.pogodin/react-css-modules", {
          localIdentName: localIdentNameFactory('fullhash:base64:6'),
          // NOTE: No need for `context` and `uniqueName` settings here.
        }]
      ]
    };
    ```

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

### Migration v7 &rArr; v8
[Migration v7 &rArr; v8]: #migration-v7--v8

[v8] version of this plugin drops compatibility with now deprecated [css-loader]
(the old way to process CSS with Webpack), and aims to be compatible with [Native CSS]
processing instead. To migrate:

- Switch to [Native CSS] in your Webpack configuration.

- Upgrade this plugin to [v8] version, and update its configuration:

  - Replace `generateScopedName` option by `localIdentName`.

    If you used a string value, be sure to set `context` and `uniqueName`
    options of this plugin to match `context` and [output.uniqueName] values
    used by Webpack.

    If you used `getLocalIdent()` & `generateScopedName()` functions exported by
    this plugin, replace them by the new `localIdentNameFactory()` export.

  - Be sure to double-check that class names generated by Webpack and this
    plugin are matching each other. In particular, Webpack includes into hashes
    the paths of CSS files relative to the context, and [output.uniqueName]
    values, it is easy to make a mistake and end up with Webpack and this
    plugin getting different values of these parameters.

## Configuration

### Plugin Options

These are valid plugin options. All are optional, but the overall configuration
should be compatible with that of Webpack, thus defaults may not work for
you.

- `context` &mdash; **string** &mdash; Must match Webpack
  [`context`](https://webpack.js.org/configuration/entry-context/#context).
  Defaults `process.cwd()`.

- `exclude` &mdash; **string** &mdash; A RegExp that will exclude otherwise
  included files _e.g._, to exclude all styles from `node_modules`:
  `exclude: 'node_modules'`.

- `filetypes` &mdash; [Configurate syntax loaders] like sugarss, LESS and SCSS,
  and extra plugins for them.

- `localIdentName` &mdash; **function | string** &mdash; Allows to customize the exact
  `styleName` to `className` conversion algorithm. For details see
  [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names).
  Defaults `[file]__[local]__[hash:base64:6]`.

- `replaceImport` &mdash; **boolean** &mdash; Replaces / removes stylesheet
  imports for server-side rendering purposes. [See details below](#server-side-rendering).
  Defaults _false_.

- `webpackHotModuleReloading` &mdash; **boolean** | `"commonjs"` &mdash; Enables
  injection of [Hot Module Reloading] code.

- `handleMissingStyleName` &mdash; `ignore` | `throw` | `warn` &mdash;
  Determines what should be done for undefined CSS modules (using a `styleName`
  for which there is no CSS module defined). Defaults `"throw"`.

- `attributeNames` &mdash; [Custom Attribute Mapping]

- `skip` &mdash; **boolean** &mdash; Whether to apply plugin if no matching
  `attributeNames` found in the file. Defaults _false_.

- [transform] &mdash; **function** &mdash; If provided, each CSS source loaded by
  the plugin will be passed through this function, alongside its path,
  and this plugin's options, and the output of this function will be used
  in place of the original CSS.

- `autoResolveMultipleImports` &mdash; **boolean** &mdash; Allows multiple
  anonymous imports if`styleName` is only in one of them. Defaults _true_.

### Deprecated Plugin Options
- ~~`removeImport` &mdash; **boolean**~~ &mdash; Use `replaceImport` option instead.

### Configurate syntax loaders
[Configurate syntax loaders]: #configurate-syntax-loaders

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

### Hot Module Reloading
[Hot Module Reloading]: #hot-module-reloading

If you don't know what is Hot Module Reloading (HMR), refer to the
[Webpack documentation](https://webpack.js.org/concepts/hot-module-replacement).

If you use HMR in your development setup (you probably should), depending on
your particular configuration you might need to enable `webpackHotModuleReloading`
option of this plugin, or you may need to leave it disabled (default), as other
loaders / plugins in your Webpack pipeline for CSS may already inject required
HMR code.

In case you decide to enable it in this plugin, `webpackHotModuleReloading`
option may be set equal:

- _true*_ &mdash; this plugin will inject HMR accept code for each imported CSS
  module, using `import.meta.webpackHot` (ESM) syntax
  ([see for details](https://webpack.js.org/api/hot-module-replacement)).

- `commonjs` &mdash; this plugin will inject HMR accept code using
  the legacy `module.hot` syntax.

The default value is _false_ &mdash; this plugin does not inject HMR accept code.

### transform
[transform]: #transform

```ts
function transform(cssSource, cssSourceFilePath, pluginOptions): string
```
The transform function, if provided as the `transform` option of this plugin,
will be called for each loaded CSS source with three arguments:
- `cssSource` &mdash; **string** &mdash; The loaded CSS code.
- `cssSourceFilePath` &mdash; **string** &mdash; The path of loaded CSS file.
- `pluginOptions` &mdash; **object** &mdash; The options set for this plugin.

It should return a string, the actual CSS code to use.

### Custom Attribute
[Custom Attribute Mapping]: #custom-attribute

You can set your own attribute mapping rules using the `attributeNames` option.

It's an object, where keys are source attribute names and values are destination
attribute names.

For example, the
[&lt;NavLink&gt;](https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/docs/api/NavLink.md)
component from [React Router](https://github.com/ReactTraining/react-router)
has an `activeClassName` attribute to accept an additional class name. You can
set `"attributeNames": { "activeStyleName": "activeClassName" }` to transform it.

The default `styleName` &rArr; `className` transformation **will not** be affected
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

1.  Builds the index of all stylesheet imports per file (imports of files with
    `.css`, and other configured CSS extensions).

2.  Uses [postcss](https://github.com/postcss/postcss) to parse the matching
    CSS files into a lookup of CSS module references.

3.  Iterates through all
    [JSX](https://facebook.github.io/react/docs/jsx-in-depth.html)
    element declarations.

4.  Parses the `styleName` (and/or other configured) attribute values into
    anonymous and named CSS module references.

5.  Finds the CSS class name matching the CSS module reference:
    * If `styleName` value is a string literal, generates a string literal value.
    * If `styleName` value is a
      [`jSXExpressionContainer`](https://babeljs.io/docs/en/next/babel-types.html#jsxexpressioncontainer),
      uses a helper function ([`getClassName`](./src/getClassName.js))
      to construct the `className` value at the runtime.

6.  Removes the `styleName` attribute from the element.

7.  Appends the resulting `className` to the existing `className` value
    (creates `className` attribute if one does not exist).

8.  With the `replaceImport` feature enabled, it also removes anonymous
    style imports from the code, and replaces named imports by the corresponding
    constant declarations.

### Project history

This plugin is a fork and further evolution of the original
[babel-plugin-react-css-modules].

- The original plugin has been abandoned by its owner since 2019,
  and does not work with modern Webpack versions since 2020.
  
- This fork, created in 2020, receives regular maintenance,
  works with the latest Webpack versions, and gets new features as necessary.

There is no reference to this fork in the original plugin's repository because
the owner of the original plugin removed announcements of this fork from his
repository, and banned this fork's author from further commenting in there &mdash;
he had no time to care about his stale plugin, but he has found a moment to spoil
chances of users to find a working alternative.

### `css-loader` compatibility
[`css-loader` compatibility]: #css-loader-compatibility

The original plugin, and the versions of this fork prior to its v8 aimed for
compatibility with now deprecated [css-loader] (the legacy way to process CSS
by Webpack, replaced by [Native CSS]). If you still need to work with `css-loader`
in your project, consult
the [`css-loader` compatibility](https://github.com/birdofpreyru/babel-plugin-react-css-modules/tree/v7.1.0#css-loader-compatibility)
table of for plugin versions.

<!-- Reusable links -->

[Babel]: https://babeljs.io
[babel-plugin-react-css-modules]: https://www.npmjs.com/package/babel-plugin-react-css-modules
[CSS modules]: https://github.com/css-modules/css-modules
[css-loader]: https://www.npmjs.com/package/css-loader
[Native CSS]: https://webpack.js.org/guides/native-css
[output.uniqueName]: https://webpack.js.org/configuration/output/#outputuniquename
[React]: https://reactjs.org
[v8]: https://github.com/birdofpreyru/babel-plugin-react-css-modules/releases/tag/v8.0.0
[Webpack]: https://webpack.js.org
