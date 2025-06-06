import { readFileSync } from 'fs'

export class ContentFileLoader {
  static load(path: string): string {
    return readFileSync(path, 'utf8')
  }
}
