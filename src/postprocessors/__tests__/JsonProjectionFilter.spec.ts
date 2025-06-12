import { JsonProjectionFilter } from '../JsonProjectionFilter.js'

describe('JsonProjectionFilter', () => {
  it('filters nested objects according to the projection', async () => {
    const input = {
      root: {
        candles: [
          { time: 't1', open: 1, close: 2 },
          { time: 't2', open: 3, close: 4 },
        ],
        indicators: [
          { time: 't1', rsi: 30, ema: 1 },
          { time: 't2', rsi: 35, ema: 2 },
        ],
      },
    }

    const filter = new JsonProjectionFilter({
      time: true,
      close: true,
      rsi: true,
    })
    const result = JSON.parse(await filter.postProcess(JSON.stringify(input)))
    expect(result).toEqual({
      root: {
        candles: [
          { time: 't1', close: 2 },
          { time: 't2', close: 4 },
        ],
        indicators: [
          { time: 't1', rsi: 30 },
          { time: 't2', rsi: 35 },
        ],
      },
    })
  })

  it('returns a message when no keys match', async () => {
    const filter = new JsonProjectionFilter({ bar: true })
    const result = await filter.postProcess(JSON.stringify({ foo: 1 }))
    expect(result).toBe('No matching fields found in json data')
  })

  it('limits array sizes when limit is provided', async () => {
    const input = {
      root: {
        candles: [
          { time: 't1', open: 1, close: 2 },
          { time: 't2', open: 3, close: 4 },
        ],
        indicators: [
          { time: 't1', rsi: 30 },
          { time: 't2', rsi: 35 },
        ],
      },
    }
    const filter = new JsonProjectionFilter(
      { time: true, close: true, rsi: true },
      1,
    )
    const result = JSON.parse(await filter.postProcess(JSON.stringify(input)))
    expect(result).toEqual({
      root: {
        candles: [{ time: 't2', close: 4 }],
        indicators: [{ time: 't2', rsi: 35 }],
      },
    })
  })

  it('supports nested projection objects on a specific key', async () => {
    const input = {
      root: {
        indicators: [
          { time: 't1', macd: { macd: 1, signal: 2, hist: 3 } },
          { time: 't2', macd: { macd: 4, signal: 5, hist: 6 } },
        ],
      },
    }

    const filter = new JsonProjectionFilter({
      indicators: {
        time: true,
        macd: { signal: true },
      },
    })

    const result = JSON.parse(await filter.postProcess(JSON.stringify(input)))
    expect(result).toEqual({
      root: {
        indicators: [
          { time: 't1', macd: { signal: 2 } },
          { time: 't2', macd: { signal: 5 } },
        ],
      },
    })
  })

  it('combines global and nested projections correctly', async () => {
    const input = {
      root: {
        indicators: [
          { time: 't1', bbands: { lower: 0, middle: 1, upper: 2 }, rsi: 30 },
          { time: 't2', bbands: { lower: 3, middle: 4, upper: 5 }, rsi: 35 },
        ],
        candles: [
          { time: 't1', open: 1, close: 2 },
          { time: 't2', open: 3, close: 4 },
        ],
      },
    }

    const filter = new JsonProjectionFilter({
      time: true,
      bbands: { upper: true },
    })

    const result = JSON.parse(await filter.postProcess(JSON.stringify(input)))
    expect(result).toEqual({
      root: {
        indicators: [
          { time: 't1', bbands: { upper: 2 } },
          { time: 't2', bbands: { upper: 5 } },
        ],
        candles: [{ time: 't1' }, { time: 't2' }],
      },
    })
  })
})
