import type { Context } from 'koishi'
import { appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import {} from '@koishijs/plugin-help'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify/sync'
import { Logger, Random, Schema } from 'koishi'
import { DictSource } from 'koishi-plugin-dict'

const logger = new Logger('dict-cave')

class CaveDictSource extends DictSource {
  caves: string[] = []

  constructor(ctx: Context, public config: CaveDictSource.Config) {
    super(ctx)

    config.lvory && ctx.middleware(async (session, next) => {
      const content = session.content || ''
      const reversed = content.toLowerCase().includes('yrovl')
      if (reversed || content.toLowerCase().includes('lvory')) {
        const cave = Random.pick(this.caves)
        return reversed ? cave.split('').reverse().join('') : cave
      }
      return next()
    })

    const filename = path.join(this.ctx.baseDir, 'data', config.filename)

    ctx.command('say <message:text>', '海狶说')
      .alias('说', '你嘻', '你囍', '你狶')
      .action(async ({ session }, message) => {
        const content = message.trim()
        if (!content)
          return '你倒是狶啊。'
        this.caves.push(content)
        await appendFile(filename, stringify([[content, session?.userId]]))
        return content
      })

    ctx.on('ready', async () => {
      const parser = parse({ columns: true })
      parser.on('readable', () => {
        let record = parser.read()
        while (record !== null) {
          this.caves.push(record.content)
          record = parser.read()
        }
      })
      parser.write(await readFile(filename))
      parser.end(() => {
        logger.info(`loaded ${this.caves.length} caves.`)
        this.ctx.emit('dict-added', this.config.name)
      })
    })

    this.ctx.on('dispose', () => {
      this.ctx.emit('dict-removed', this.config.name)
    })
  }

  override lookupSync(name: string): string[] {
    return name === this.config.name ? this.caves : []
  }
}

namespace CaveDictSource {
  export interface Config {
    lvory: boolean
    name: string
    filename: string
  }

  export const Config: Schema<Config> = Schema.object({
    lvory: Schema.boolean().default(true).description('牢瑞！'),
    name: Schema.string().default('lvory').description('字典名称。'),
    filename: Schema.string().default('cave.csv').description('字典文件名。'),
  })
}

export default CaveDictSource
