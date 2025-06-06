import ccxt from 'ccxt'
import { Indicators } from '@ixjb94/indicators'
import { BaseContentComponent } from '../BaseContentComponent.js'
import { Decimal } from 'decimal.js'
import logger from '../../logger.js'

interface IndicatorConfig {
  period: number
}

interface MACDIndicatorConfig {
  short_period: number
  long_period: number
  signal_period: number
}

interface BBandsIndicatorConfig {
  period: number
  stddev: number
}

interface OHLCV2ComponentConfig {
  description: string // prompt description
  exchange: string // name of the exchange
  symbol: string // symbol of the market to fetch OHLCV data for
  timeframe: string // the length of time each candle represents
  inputCandles: number // number of candles retrieved and basis for indicator calculation
  outputCandles?: number // final output: number of last candles + calculated indicators (default: inputCandles)
  indicators?: {
    sma?: IndicatorConfig
    ema?: IndicatorConfig
    rsi?: IndicatorConfig
    macd?: MACDIndicatorConfig
    atr?: IndicatorConfig
    bbands?: BBandsIndicatorConfig
  }
  sigDigits?: number // Specifies how many significant digits to use when rounding all indicator values (defaults to 4 if not provided).
}

const defaultConfig: OHLCV2ComponentConfig = {
  description:
    'The following JSON array contains historical market data for the trading pair {{symbol}} over a {{timeframe}} timeframe.',
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  inputCandles: 150,
  outputCandles: 100,
  indicators: {},
  sigDigits: 4,
}

export class OHLCVComponent extends BaseContentComponent<OHLCV2ComponentConfig> {
  constructor(config: Partial<OHLCV2ComponentConfig> = {}) {
    // If outputCandles is not set, use inputCandles
    if (
      config.outputCandles === undefined &&
      config.inputCandles !== undefined
    ) {
      config.outputCandles = config.inputCandles
    }
    const mergedConfig = { ...defaultConfig, ...config }
    super(mergedConfig.description, mergedConfig)
  }

  async getContent(): Promise<string> {
    try {
      const CCXT = ccxt as any
      let exchange = new CCXT[this.config.exchange]()
      await exchange.fetchMarkets()

      // Retrieve OHLCV data
      const rawOHLCV: any[] = await exchange.fetchOHLCV(
        this.config.symbol,
        this.config.timeframe,
        undefined,
        this.config.inputCandles,
      )

      // Convert raw data into candle objects
      const candles = rawOHLCV.map((candle) => {
        const [timestamp, open, high, low, close, volume] = candle
        return {
          time: new Date(timestamp).toISOString(),
          open,
          high,
          low,
          close,
          volume,
        }
      })

      // Extract price arrays for indicator calculations
      const closePrices = candles.map((c) => c.close)
      const highPrices = candles.map((c) => c.high)
      const lowPrices = candles.map((c) => c.low)

      // Prepare containers for computed indicators
      let indicatorsOutput: any[] = []
      const computedIndicators: {
        [key: string]: { offset: number; values: number[] }
      } = {}
      let computedMACD:
        | { offset: number; macd: number[]; signal: number[]; hist: number[] }
        | undefined = undefined
      let computedBBands:
        | { offset: number; lower: number[]; middle: number[]; upper: number[] }
        | undefined = undefined

      const ta = new Indicators()

      // Calculate each configured indicator
      if (
        this.config.indicators &&
        Object.keys(this.config.indicators).length > 0
      ) {
        // SMA
        if (this.config.indicators.sma) {
          const smaVals = await ta.sma(
            closePrices,
            this.config.indicators.sma.period,
          )
          const offset = candles.length - smaVals.length
          computedIndicators['sma'] = { offset, values: smaVals }
        }

        // EMA
        if (this.config.indicators.ema) {
          const emaVals = await ta.ema(
            closePrices,
            this.config.indicators.ema.period,
          )
          const offset = candles.length - emaVals.length
          computedIndicators['ema'] = { offset, values: emaVals }
        }

        // RSI
        if (this.config.indicators.rsi) {
          const rsiVals = await ta.rsi(
            closePrices,
            this.config.indicators.rsi.period,
          )
          const offset = candles.length - rsiVals.length
          computedIndicators['rsi'] = { offset, values: rsiVals }
        }

        // MACD
        if (this.config.indicators.macd) {
          const { short_period, long_period, signal_period } =
            this.config.indicators.macd
          const [macdVals, signalVals, histVals] = (await ta.macd(
            closePrices,
            short_period,
            long_period,
            signal_period,
            closePrices.length,
          )) as [number[], number[], number[]]
          const offset = candles.length - macdVals.length
          computedMACD = {
            offset,
            macd: macdVals,
            signal: signalVals,
            hist: histVals,
          }
        }

        // ATR
        if (this.config.indicators.atr) {
          const atrVals = await ta.atr(
            highPrices,
            lowPrices,
            closePrices,
            this.config.indicators.atr.period,
          )
          const offset = candles.length - atrVals.length
          computedIndicators['atr'] = { offset, values: atrVals }
        }

        // Bollinger Bands
        if (this.config.indicators.bbands) {
          const { period, stddev } = this.config.indicators.bbands
          const [lowerVals, middleVals, upperVals] = (await ta.bbands(
            closePrices,
            period,
            stddev,
          )) as [number[], number[], number[]]
          const offset = candles.length - middleVals.length
          computedBBands = {
            offset,
            lower: lowerVals,
            middle: middleVals,
            upper: upperVals,
          }
        }
      }

      // Compute the maximal offset among all indicators
      const offsets: number[] = []
      Object.values(computedIndicators).forEach((ind) =>
        offsets.push(ind.offset),
      )
      if (computedMACD) offsets.push(computedMACD.offset)
      if (computedBBands) offsets.push(computedBBands.offset)
      const globalOffset = offsets.length > 0 ? Math.max(...offsets) : 0

      // Determine valid length of data after applying global offset
      let validLength = candles.length - globalOffset
      Object.values(computedIndicators).forEach((ind) => {
        const avail = ind.values.length - (globalOffset - ind.offset)
        if (avail < validLength) validLength = avail
      })
      if (computedMACD) {
        const avail =
          computedMACD.macd.length - (globalOffset - computedMACD.offset)
        if (avail < validLength) validLength = avail
      }
      if (computedBBands) {
        const avail =
          computedBBands.middle.length - (globalOffset - computedBBands.offset)
        if (avail < validLength) validLength = avail
      }

      // Helper to round values using configurable significant digits (default 4)
      const sigDigits = this.config.sigDigits ?? 4
      const round = (num: number) =>
        Number(new Decimal(num).toSignificantDigits(sigDigits).toNumber())

      // Assemble indicator entries aligned by time
      for (let i = 0; i < validLength; i++) {
        // @ts-ignore
        const time = candles[i + globalOffset].time
        const entry: any = { time }

        // Append SMA
        if (computedIndicators['sma']) {
          const { offset, values } = computedIndicators['sma']
          // @ts-ignore
          entry.sma = round(values[i + (globalOffset - offset)])
        }
        // Append EMA
        if (computedIndicators['ema']) {
          const { offset, values } = computedIndicators['ema']
          // @ts-ignore
          entry.ema = round(values[i + (globalOffset - offset)])
        }
        // Append RSI
        if (computedIndicators['rsi']) {
          const { offset, values } = computedIndicators['rsi']
          // @ts-ignore
          entry.rsi = round(values[i + (globalOffset - offset)])
        }
        // Append MACD
        if (computedMACD) {
          const baseIdx = i + (globalOffset - computedMACD.offset)
          entry.macd = {
            // @ts-ignore
            macd: round(computedMACD.macd[baseIdx]),
            // @ts-ignore
            signal: round(computedMACD.signal[baseIdx]),
            // @ts-ignore
            hist: round(computedMACD.hist[baseIdx]),
          }
        }
        // Append ATR
        if (computedIndicators['atr']) {
          const { offset, values } = computedIndicators['atr']
          // @ts-ignore
          entry.atr = round(values[i + (globalOffset - offset)])
        }
        // Append Bollinger Bands
        if (computedBBands) {
          const bbIdx = i + (globalOffset - computedBBands.offset)

          entry.bbands = {
            // @ts-ignore
            lower: round(computedBBands.lower[bbIdx]),
            // @ts-ignore
            middle: round(computedBBands.middle[bbIdx]),
            // @ts-ignore
            upper: round(computedBBands.upper[bbIdx]),
          }
        }

        indicatorsOutput.push(entry)
      }

      // Limit to requested outputCandle count
      const numOutput = Math.min(
        validLength,
        this.config.outputCandles ?? this.config.inputCandles,
      )
      const start = validLength - numOutput
      const finalIndicators = indicatorsOutput.slice(start)
      const finalCandles = candles.slice(
        globalOffset + start,
        globalOffset + validLength,
      )

      // Build final result
      const result = {
        [this.config.timeframe]: {
          candles: finalCandles,
          indicators: finalIndicators,
        },
      }

      logger.debug(JSON.stringify(result))
      return JSON.stringify(result)
    } catch (error) {
      logger.error(
        `Error fetching OHLCV: exchange=${this.config.exchange}, symbol=${this.config.symbol}, timeframe=${this.config.timeframe}, ${error}`,
      )
      return `{"error":"Error fetching OHLCV data"}`
    }
  }
}
