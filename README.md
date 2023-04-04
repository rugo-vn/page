# Rugo Page

## Getting Started

Create your own `package.json` file and add more information:

```json
{
  "type": "module",
  "scripts": {
    "dev": "rugopa",
    "build": "rugopa --build"
  },
  "devDependencies": {
    "vite": "^4.2.0",
    "@rugo-vn/page": "@latest"
  }
}
```

To install dependency packages, run:

```bash
npm i
```

To live preview, run:

```bash
npm run dev
```

To build, run:

```bash
npm run build
```

## Fundamentals

All `.html` files will be sent into Vite to build related assets to `.rugopa/statics`.

All `ejs.html` files will be sent into Vite to build related assets to `.rugopa/statics`, itself will be moved into `.rugopa/views`.

All `.ejs` files will be copied into `.rugopa/views`.

<!--
## Install

```bash
npm i -D @rugo-vn/page
```

Add scripts:

```json
{
  "scripts": {
    "dev": "rugopa",
    "build": "rugopa --build"
  }
}
```

Run:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Configuration

**`rugopa.config.js`**

```js
{
  sourceDir: /* source directory to store all working files */,
  assets: [/* path to asset need to render */],
  statics: [/* path to asset need to copy as static */],
  templates: [/* path to template need to render, allowed .ejs, .html */],
  routes: [
    {
      method: /* http method */,
      path: /* path to lookup */,
      view: /* view to render, lookup from .rugopa/views */,
    }
  ]
}
```

All `.ejs` file in the root of `sourceDir` will be copied into views. -->

## License

MIT
