import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { OHLCVCSVFormatter } from '../OHLCVCSVFormatter.js'

describe('OHLCVCSVFormatter', () => {
  it('converts OHLCV JSON to CSV', async () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    const json = readFileSync(join(dir, '../__fixtures__/ohlcv.json'), 'utf-8')
    const expected = readFileSync(
      join(dir, '../__fixtures__/ohlcv.csv'),
      'utf-8',
    )
    const formatter = new OHLCVCSVFormatter()
    const result = await formatter.postProcess(json)
    expect(result.trim()).toBe(expected.trim())
  })
})
