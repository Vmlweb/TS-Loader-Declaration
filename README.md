# TS Loader Decleration

Generates bundled Webpack Typescript declarations from exports.

Inspired by [declaration-bundler-webpack-plugin](https://www.npmjs.com/package/declaration-bundler-webpack-plugin).

## Installation

You can grab the latest version via NPM.

```bash
npm install --save-dev ts-loader-decleration
```

## Configuration

First ensure `declaration: true` is set in your `tsconfig.json` for declaration files to be generated.

Finally include the plugin in your Webpack configuration.

```javascript
const path = require('path')
const webpack = require('webpack')
const JavaScriptObfuscator = require('webpack-obfuscator')
const nodeExternals = require('webpack-node-externals')
const { TSDeclerationsPlugin } = require('ts-loader-decleration')

module.exports = {
	entry: {
		main: './src/index.ts',
		other: './src/other.ts'
	},
	target: 'node',
	resolve: {
		extensions: ['.ts', '.js']
	},
	externals: [
		nodeExternals()
	],
	output: {
		filename: './index.js',
		libraryTarget: "commonjs"
	},
	plugins: [
		new TSDeclerationsPlugin({
			main: './src/index.d.ts'
		}),
		new webpack.optimize.UglifyJsPlugin(),
		new JavaScriptObfuscator({
			disableConsoleOutput: false
		}),
    ],
	module: {
		rules: [{
			test: /\.ts$/,
			loader: 'ts-loader',
			exclude: /(node_modules|bower_components)/
		}]
	}
}
```

Only modules exported from your entry file will be included in the bundled declaration.

## Awesome Typescript Loader

When using AWS there is an issue where imports will not be included in the declaration bundle unless it has been used literally. There is a loader included to patch this issue.

```javascript
{
	test: /\.ts$/,
	use: [{
		loader: 'awesome-typescript-loader',
		query: {
			declaration: true,
			//...
		}
	}, {
		loader: 'ts-loader-decleration'
	}]
}
```