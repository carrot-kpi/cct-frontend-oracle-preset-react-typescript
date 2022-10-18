import chalk from 'chalk'
import { formatWebpackMessages } from './utils/format-webpack-messages.js'
import WebpackDevServer from 'webpack-dev-server'
import webpack from 'webpack'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import HtmlWebpackPlugin from 'html-webpack-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

const printInstructions = (writableStream) => {
  writableStream.write('Playground available at:\n\n  http://localhost:9000')
}

export const startPlayground = async (
  forkedNetworkChainId,
  templateId,
  secretKey,
  writableStream
) => {
  let compiler = webpack({
    mode: 'development',
    infrastructureLogging: {
      level: 'none',
    },
    stats: 'none',
    entry: join(__dirname, '../playground/app.tsx'),
    resolve: {
      extensions: ['.ts', '.tsx', '...'],
    },
    module: {
      rules: [{ test: /\.tsx?$/, use: 'ts-loader' }],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: join(__dirname, '../playground/index.html'),
      }),
      new webpack.DefinePlugin({
        'window.CHAIN_ID': `"${forkedNetworkChainId}"`,
        'window.TEMPLATE_ID': `"${templateId}"`,
        'window.DEPLOYMENT_ACCOUNT_PRIVATE_KEY': `"${secretKey}"`,
      }),
    ],
  })

  compiler.hooks.invalid.tap('invalid', () => {
    writableStream.write('Compiling playground...')
  })

  compiler.hooks.done.tap('done', async (stats) => {
    const statsData = stats.toJson({
      all: false,
      warnings: true,
      errors: true,
    })

    const messages = formatWebpackMessages(statsData)
    const isSuccessful = !messages.errors.length && !messages.warnings.length
    if (isSuccessful) {
      printInstructions(writableStream)
      return
    } else if (messages.errors.length) {
      if (messages.errors.length > 1) messages.errors.length = 1
      writableStream.write(
        `Failed to compile playground.\n${messages.errors.join('\n\n')}`
      )
      return
    } else if (messages.warnings.length)
      writableStream(
        chalk.yellow(
          `Playground compiled with warnings:\n${messages.warnings.join(
            '\n\n'
          )}`
        )
      )
  })

  const devServer = new WebpackDevServer(
    {
      port: 9000,
      open: true,
      compress: true,
    },
    compiler
  )
  await devServer.start()
}
