// const webpack = require('webpack');
const { resolve, join } = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const pkg = require('./package.json');
const CopyPlugin = require('copy-webpack-plugin');
const { addDisplayNameTransformer } = require('ts-react-display-name')
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const createStyledComponentsTransformer = require('typescript-plugin-styled-components').default;

const sharedConfig = {
  cache: false,
  devtool: false,
  devServer: {
    static: {
      directory: join(__dirname, 'dist'),
    },
    compress: true,
    port: 3200
  },
  output: {
    chunkFilename: '[name].js',
    filename: '[name].js',
    path: resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers: () => ({
                before: [
                  createStyledComponentsTransformer(),
                  // addDisplayNameTransformer()
                ]
              })
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true
            },
          },
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
            },
          }
        ],
      },
      {
        test: /\.(jpg|png|gif)$/,
        use: {
          loader: 'url-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    fallback: {
      buffer: require.resolve('buffer/'),
    },
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minChunks: 1,
      maxAsyncRequests: 6,
      maxInitialRequests: 4,
      automaticNameDelimiter: '~',
      // maxSize: 500_000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  stats: {
    all: undefined,
    assets: true,
    assetsSort: '!size',
    builtAt: false,
    cached: false,
    cachedAssets: false,
    children: true,
    chunks: false,
    chunkGroups: false,
    chunkModules: false,
    chunkOrigins: false,
    chunksSort: 'size',
    depth: false,
    entrypoints: true,
    env: false,
    errors: true,
    errorDetails: true,
    modules: false,
    modulesSort: 'size',
    moduleTrace: false,
    providedExports: false,
    reasons: false,
    source: false,
    timings: true,
    usedExports: false,
    version: true,
    warnings: false,
  },
};

module.exports = (env, argv) => ({
  ...sharedConfig,
  entry: {
    knots: resolve(__dirname, 'src/index.tsx'),
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(pkg.version),
      __MODE__: JSON.stringify(argv.mode),
    }),
    new webpack.SourceMapDevToolPlugin({
      exclude: ['vendors.js'],
    }),
    // new CopyPlugin({
    //   patterns: [
    //     {
    //       from: './src/img/*.*',
    //       to: () => 'assets/[name][ext]'
    //     },
    //   ],
    // }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
      ignoreOrder: false,
    }),
    new HtmlWebpackPlugin({
      title: `Knots`,
      filename: 'index.html',
      template: './src/assets/index.html',
    })
  ],
});
