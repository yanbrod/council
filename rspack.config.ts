import { defineConfig } from '@rspack/cli';
import { HtmlRspackPlugin } from '@rspack/core';
import path from 'path';

export default defineConfig({
  experiments: {
    css: true,
  },
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: {
                react: {
                  runtime: 'automatic',
                  importSource: 'preact',
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  plugins: [
    new HtmlRspackPlugin({
      template: './src/index.html',
    }),
  ],
  devServer: {
    port: 3000,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3001',
      },
    ],
    historyApiFallback: true,
  },
});
