import type { Context } from 'koishi'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {} from '@koishijs/plugin-help'
import { parse } from 'csv-parse'
import { h, Logger, Random, Schema } from 'koishi'
import { DictSource } from 'koishi-plugin-dict'
import { shortcut } from 'koishi-plugin-montmorill'

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
        return h(
          'qq:markdown',
          reversed ? cave.split('').reverse().join('') : cave,
          `\n> 再来一次 👉 ${shortcut(session.isDirect, reversed ? 'yrovl' : 'lvory')}`,
        )
      }
      return next()
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
      parser.write(await readFile(path.join(this.ctx.baseDir, 'data', 'cave.csv')))
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
