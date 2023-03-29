import rimraf from 'rimraf';
import webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
// import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('concept test', function () {
  it('should remove temporary directory', () => {
    rimraf.sync(join(__dirname, '.rugopa'));
  });

  it('should build', async () => {
    const res = await new Promise((resolve, reject) =>
      webpack({
        entry: [join(__dirname, './index.js')],
        output: {
          filename: '[name].[contenthash].js',
          path: join(__dirname, './.rugopa/statics'),
        },
        module: {
          rules: [
            {
              test: /\.css$/i,
              use: [
                'style-loader',
                // MiniCssExtractPlugin.loader,
                'css-loader',
                'postcss-loader',
              ],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({
            inject: false,
            template: join(__dirname, './src/parts/header.ejs'),
            filename: '../views/parts/header.ejs',
            publicPath: '/',
          }),
          new HtmlWebpackPlugin({
            inject: false,
            template: join(__dirname, './src/parts/footer.ejs'),
            filename: '../views/parts/footer.ejs',
            publicPath: '/',
          }),
          new CopyPlugin({
            patterns: [
              {
                from: join(__dirname, 'src', '*.ejs'),
                to({ absoluteFilename }) {
                  return join(
                    __dirname,
                    './.rugopa/views',
                    relative(join(__dirname, 'src'), absoluteFilename)
                  );
                },
                toType: 'file',
              },
            ],
          }),
          new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            chunkFilename: '[id].[contenthash].css',
          }),
        ],
        optimization: {
          minimizer: [
            /* new CssMinimizerPlugin() */
          ],
        },
      }).run((err, stats) => (err ? reject(err) : resolve(stats)))
    );

    // console.log(Object.keys(res.compilation), res.compilation.entries.keys());

    expect(res.compilation.entries.keys().next().value).to.be.eq('main');
  });
});
