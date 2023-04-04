#!/usr/bin/env node

import process from 'process';
import rimraf from 'rimraf';
import http from 'http';
import WebSocket from 'faye-websocket';
import { createServer as createViteServer, build as buildVite } from 'vite';
import { dirname, join, parse, relative, resolve } from 'path';
import { createBroker, exec } from '@rugo-vn/service';
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'fs';
import { flatten, mergeDeepLeft } from 'ramda';
import { fileURLToPath } from 'url';

import * as FxService from '@rugo-vn/fx';
import * as ServerService from '@rugo-vn/server';
import * as StorageService from '@rugo-vn/storage';
import * as BuildService from './build.js';
import * as MockDbService from './mocks/db.js';

const WAIT = 100;
const isBuild = process.argv
  .map((i) => i.trim().toLowerCase())
  .some((i) => i === '--build');
const __dirname = dirname(fileURLToPath(import.meta.url));

function scanDir(dir) {
  const ls = readdirSync(dir);
  return flatten(
    ls.map((name) => {
      const entry = join(dir, name);

      if (statSync(entry).isDirectory())
        return scanDir(entry).map((childName) => join(name, childName));

      return name;
    })
  );
}

async function createServer() {
  // config
  const workRoot = process.cwd();
  const workConfig =
    (await import(join(workRoot, 'rugopa.config.js'))).default || {};

  const spaceId = '.rugopa';
  const staticDrive = 'statics';
  const viewDrive = 'views';

  const storage = workRoot;
  const runRoot = join(workRoot, spaceId);
  const staticDir = join(runRoot, staticDrive);
  const viewDir = join(runRoot, viewDrive);
  const entryPath = join(runRoot, './index.js');

  const srcDir = join(workRoot, workConfig.sourceDir);

  rimraf.sync(runRoot);

  mkdirSync(runRoot, { recursive: true });
  mkdirSync(staticDir, { recursive: true });
  mkdirSync(viewDir, { recursive: true });

  const settings = {
    storage,
    server: {
      port: 3000,
      routes: [],
      space: {
        id: spaceId,
        name: spaceId,
        drives: {
          [staticDrive]: true,
          [viewDrive]: true,
        },
      },
    },
    mocks: workConfig.mocks || {},
  };

  const modules = {};
  for (const name in workConfig.modules || {}) {
    modules[name] = (
      await import(join(workRoot, workConfig.modules[name]))
    ).default;
  }

  for (const route of workConfig.routes || []) {
    settings.server.routes.push({
      method: route.method || 'get',
      path: route.path,
      handlers: [
        {
          name: 'fx.run',
          input: {
            spaceId,
            driveName: viewDrive,
            entry: route.view,
            locals: modules,
            'locals.params': '_.params',
            'locals.query': '_.query',
            'locals.headers': '_.headers',
            'locals.method': '_.method',
          },
          output: {
            raw: '_',
          },
        },
        {
          name: 'build.run',
          input: {
            raw: '_.raw',
          },
          output: {
            body: '_',
          },
        },
      ],
    });
  }

  settings.server.routes.push({
    path: '/(.*)?',
    handlers: [
      {
        name: 'serve',
        input: { from: staticDir, path: '_.params.0' },
        output: { headers: '_.headers', body: '_.body' },
      },
    ],
  });

  // broker
  const broker = createBroker(settings);

  if (!isBuild) {
    await broker.createService(FxService);
    await broker.createService(StorageService);
    await broker.createService(BuildService);
    await broker.createService(MockDbService);
    await broker.createService(ServerService);

    await broker.start();
    await broker.call('storage.setConfig', {
      spaceId,
      driveName: staticDrive,
      config: true,
    });
    await broker.call('storage.setConfig', {
      spaceId,
      driveName: viewDrive,
      config: true,
    });
  }

  // web socket
  const server = http.createServer();
  let clients = [];
  server.addListener('upgrade', function (request, socket, head) {
    const ws = new WebSocket(request, socket, head);
    ws.onopen = function () {
      ws.send('connected');
    };

    if (WAIT > 0) {
      (function () {
        const wssend = ws.send;
        let waitTimeout;
        ws.send = function () {
          const args = arguments;
          if (waitTimeout) clearTimeout(waitTimeout);
          waitTimeout = setTimeout(function () {
            wssend.apply(ws, args);
          }, WAIT);
        };
      })();
    }

    ws.onclose = function () {
      clients = clients.filter(function (x) {
        return x !== ws;
      });
    };

    clients.push(ws);
  });

  if (!isBuild) server.listen(3001);

  // vite
  const ls = scanDir(srcDir);
  const htmlStatics = ls.filter((p) => parse(p).ext === '.html');
  const inputBuilds = {};
  for (const name of htmlStatics) inputBuilds[name] = join(srcDir, name);

  const injectContent =
    readFileSync(join(__dirname, 'inject.js')).toString() + '\n';

  function viewPlugin() {
    return {
      name: 'view',
      writeBundle() {
        rimraf.sync(viewDir);

        const ejsViews = ls.filter((p) => parse(p).ext === '.ejs');
        for (const name of ejsViews) {
          const entry = join(viewDir, name);
          mkdirSync(dirname(entry), { recursive: true });
          copyFileSync(join(srcDir, name), entry);
        }

        const htmlEjsViews = ls.filter((p) => /\.ejs\.html$/i.test(p));
        for (const name of htmlEjsViews) {
          const entry = join(viewDir, name);
          mkdirSync(dirname(entry), { recursive: true });
          renameSync(
            join(staticDir, name),
            join(dirname(entry), parse(entry).name)
          );
        }

        console.log('  templates are copied!');

        for (let ws of clients) {
          if (ws) ws.send('reload');
        }
      },

      async banner() {
        if (isBuild) return;

        return injectContent;
      },
    };
  }

  if (htmlStatics.length) {
    const viteConfig = {
      root: srcDir,
      build: {
        outDir: staticDir,
        emptyOutDir: true,
        rollupOptions: {
          input: inputBuilds,
          plugins: [viewPlugin()],
        },
      },
    };

    if (isBuild) {
      await buildVite(viteConfig);

      await exec(`cd "${staticDir}" && zip -r ../statics.zip *`);
      await exec(`cd "${viewDir}" && zip -r ../views.zip *`);

      const distDir = join(workRoot, 'dist');
      rimraf.sync(distDir);
      mkdirSync(distDir, { recursive: true });

      await exec(
        `cd "${distDir}" && mv "${join(
          runRoot,
          'statics.zip'
        )}" . && mv "${join(runRoot, 'views.zip')}" .`
      );

      console.log(' - Done.');
    } else {
      await buildVite(
        mergeDeepLeft(
          {
            build: {
              watch: {
                buildDelay: 100,
              },
            },
          },
          viteConfig
        )
      );
    }
  }
}

createServer();
