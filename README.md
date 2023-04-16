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

## License

MIT
