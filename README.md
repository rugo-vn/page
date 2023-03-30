# Rugo Page

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

All `.ejs` file in the root of `sourceDir` will be copied into views.

## License

MIT
