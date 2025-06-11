import { jest } from '@jest/globals'

// Prevent loading the actual ccxt library during tests
jest.unstable_mockModule('ccxt', () => ({
  default: {},
}))

let OHLCVComponent: typeof import('../trading/OHLCVComponent.js').OHLCVComponent

beforeAll(async () => {
  // Dynamically import the component after mocks are in place
  const mod = await import('../trading/OHLCVComponent.js')
  OHLCVComponent = mod.OHLCVComponent
})

describe('OHLCVComponent', () => {
  it('fetches candles and computes indicators', async () => {
    // Generate 7 mock OHLCV entries spaced 5 minutes apart
    const baseTime = Date.parse('2020-01-01T00:00:00Z')
    const raw = Array.from({ length: 7 }, (_, i) => {
      const n = i + 1
      return [baseTime + i * 300000, n, n + 0.5, n - 0.5, n + 0.2, 100]
    })

    // Create a mock exchange with stubbed methods
    const mockExchange = {
      markets: { 'BTC/USDT': { precision: { price: 2 } } },
      fetchMarkets: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
      fetchOHLCV: jest.fn<() => Promise<typeof raw>>().mockResolvedValue(raw),
    }

    // Factory function returning the mock exchange
    const exchangeFactory = () => mockExchange

    // Create the OHLCVComponent with indicator configuration
    const comp = new OHLCVComponent(
      {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timeframe: '5m',
        candles: 5, // number of result candles
        buffer: 2, // additional candles used for calculation
        indicators: {
          sma: { period: 3 },
          ema: { period: 3 },
          rsi: { period: 2 },
          atr: { period: 3 },
          macd: { short_period: 2, long_period: 3, signal_period: 1 },
          bbands: { period: 3, stddev: 2 },
        },
      },
      exchangeFactory,
    )

    // Get the computed output from the component
    const out = JSON.parse(await comp.getContent())

    // Assert that fetchOHLCV was called
    expect(mockExchange.fetchOHLCV).toHaveBeenCalled()

    // Check that the returned candles and indicators match the expected output
    expect(out).toEqual({
      '5m': {
        candles: [
          {
            time: '2020-01-01T00:10:00.000Z',
            open: 3,
            high: 3.5,
            low: 2.5,
            close: 3.2,
            volume: 100,
          },
          {
            time: '2020-01-01T00:15:00.000Z',
            open: 4,
            high: 4.5,
            low: 3.5,
            close: 4.2,
            volume: 100,
          },
          {
            time: '2020-01-01T00:20:00.000Z',
            open: 5,
            high: 5.5,
            low: 4.5,
            close: 5.2,
            volume: 100,
          },
          {
            time: '2020-01-01T00:25:00.000Z',
            open: 6,
            high: 6.5,
            low: 5.5,
            close: 6.2,
            volume: 100,
          },
          {
            time: '2020-01-01T00:30:00.000Z',
            open: 7,
            high: 7.5,
            low: 6.5,
            close: 7.2,
            volume: 100,
          },
        ],
        indicators: [
          {
            time: '2020-01-01T00:10:00.000Z',
            sma: 2.2,
            ema: 2.45,
            rsi: 100,
            macd: { macd: 0.31, signal: 0.31, hist: 0 },
            atr: 1.2,
            bbands: { lower: 0.57, middle: 2.2, upper: 3.83 },
          },
          {
            time: '2020-01-01T00:15:00.000Z',
            sma: 3.2,
            ema: 3.33,
            rsi: 100,
            macd: { macd: 0.39, signal: 0.39, hist: 0 },
            atr: 1.23,
            bbands: { lower: 1.57, middle: 3.2, upper: 4.83 },
          },
          {
            time: '2020-01-01T00:20:00.000Z',
            sma: 4.2,
            ema: 4.26,
            rsi: 100,
            macd: { macd: 0.44, signal: 0.44, hist: 0 },
            atr: 1.26,
            bbands: { lower: 2.57, middle: 4.2, upper: 5.83 },
          },
          {
            time: '2020-01-01T00:25:00.000Z',
            sma: 5.2,
            ema: 5.23,
            rsi: 100,
            macd: { macd: 0.47, signal: 0.47, hist: 0 },
            atr: 1.27,
            bbands: { lower: 3.57, middle: 5.2, upper: 6.83 },
          },
          {
            time: '2020-01-01T00:30:00.000Z',
            sma: 6.2,
            ema: 6.22,
            rsi: 100,
            macd: { macd: 0.49, signal: 0.49, hist: 0 },
            atr: 1.28,
            bbands: { lower: 4.57, middle: 6.2, upper: 7.83 },
          },
        ],
      },
    })
  })
})
