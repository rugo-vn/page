#!/usr/bin/env node

import process from 'process';
import postcssrc from 'postcss-load-config';
import webpack from 'webpack';
import rimraf from 'rimraf';
import http from 'http';
import WebSocket from 'faye-websocket';
import { dirname, join, relative, resolve } from 'path';
import { createBroker } from '@rugo-vn/service';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

import * as FxService from '@rugo-vn/fx';
import * as ServerService from '@rugo-vn/server';
import * as StorageService from '@rugo-vn/storage';
import * as BuildService from './build.js';

const WAIT = 100;
const isBuild = process.argv
  .map((i) => i.trim().toLowerCase())
  .some((i) => i === '--build');
const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  // config
  const workRoot = process.cwd();
  const workConfig = (await import(join(workRoot, 'rugopa.config.js'))).default;

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
  };

  for (const route of workConfig?.routes || []) {
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

  // webpack
  let content = '';
  for (const css of workConfig.css || [])
    content += `import "${relative(runRoot, join(srcDir, css))}";\n`;

  // life reload
  if (!isBuild)
    content += readFileSync(join(__dirname, 'inject.js')).toString() + '\n';

  writeFileSync(entryPath, content);

  const { plugins, options } = await postcssrc();

  const processor = webpack({
    entry: [entryPath],
    output: {
      filename: isBuild ? '[name].[contenthash].js' : '[name].js',
      path: staticDir,
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [
            ...(isBuild ? [MiniCssExtractPlugin.loader] : ['style-loader']),
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins,
                  options,
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [
      ...(workConfig.templates || []).map(
        (templatePath) =>
          new HtmlWebpackPlugin({
            inject: false,
            template: join(srcDir, templatePath),
            filename: relative(staticDir, join(viewDir, templatePath)),
            publicPath: '/',
          })
      ),
      new CopyPlugin({
        patterns: [
          {
            from: join(srcDir, '*.ejs'),
            to({ absoluteFilename }) {
              return join(viewDir, relative(srcDir, absoluteFilename));
            },
            toType: 'file',
          },
        ],
      }),
      new MiniCssExtractPlugin({
        filename: isBuild ? '[name].[contenthash].css' : '[name].css',
        chunkFilename: isBuild ? '[id].[contenthash].css' : '[id].css',
      }),
    ],
    optimization: {
      minimizer: [
        ...(isBuild ? [new CssMinimizerPlugin(), new TerserPlugin()] : []),
      ],
    },
  });

  if (isBuild) {
    await new Promise((resolve, reject) =>
      processor.run((err, stats) => (err ? reject(err) : resolve(stats)))
    );
    console.log(' - Done.');
  } else {
    processor.watch(
      {
        // Example
        aggregateTimeout: 300,
        poll: undefined,
      },
      (err, stats) => {
        if (err) return console.error(err);

        console.log(' - Compile success. Reload.');
        for (let ws of clients) {
          if (ws) ws.send('reload');
        }
      }
    );
  }
})();
