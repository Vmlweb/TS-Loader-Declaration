# TS Loader Decleration

Generates bundled Webpack Typescript declarations from exports.

Inspired by [declaration-bundler-webpack-plugin](https://www.npmjs.com/package/declaration-bundler-webpack-plugin).

## Installation

You can grab the latest version via NPM.

```bash
npm install --save-dev ts-loader-decleration
```

## Configuration

First ensure `declaration: true` is set in your `tsconfig.json`.

Then simply include in your Webpack configuration.

```javascript
const webpack = require('webpack')
const { TSDeclerationsPlugin } = require('ts-loader-decleration')

module.exports = {
	plugins: [
		new TypescriptDeclerations({
			out: './bundle.d.ts'
		})
	],
	module: {
		rules: [{
			test: /\.ts$/,
			loader: 'ts-loader'
		}]
	}
};
```