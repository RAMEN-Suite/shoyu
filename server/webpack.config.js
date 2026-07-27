import path from 'path';
import { fileURLToPath } from 'url';
import nodeExternals from 'webpack-node-externals';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    api: './src/api.ts',
  },

  target: 'node',
  mode: 'production',

  externals: [
    nodeExternals({
      importType: 'module',
    }),
  ],

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'module',
    chunkFormat: 'module',
  },

  experiments: {
    outputModule: true,
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [new CleanWebpackPlugin()],

  optimization: {
    usedExports: true,
  },
};
