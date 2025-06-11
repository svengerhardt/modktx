/**
 * OHLCVComponent.ts
 *
 * Fetches OHLCV (Open, High, Low, Close, Volume) data plus configurable indicators
 * for a specified market symbol and timeframe. Automatically applies a buffer
 * to ensure enough historical data, computes indicators, rounds results,
 * and returns a JSON string.
 */
import ccxt from 'ccxt'
import { Indicators } from '@ixjb94/indicators'
import { BaseContentComponent } from '../BaseContentComponent.js'
import { Decimal } from 'decimal.js'
import logger from '../../logger.js'

/**
 * Configuration for simple indicators (SMA, EMA, RSI, ATR) specifying the lookback period.
 */
interface IndicatorConfig {
  period: number
}

/**
 * Configuration for MACD indicator: short, long, and signal window sizes.
 */
interface MACDIndicatorConfig {
  short_period: number
  long_period: number
  signal_period: number
}

/**
 * Configuration for Bollinger Bands: period and standard deviation multiplier.
 */
interface BBandsIndicatorConfig {
  period: number
  stddev: number
}

/**
 * Configuration options for OHLCVComponent:
 * @property description - Prompt template for the output
 * @property exchange - Exchange identifier for CCXT
 * @property symbol - Trading pair symbol, e.g. 'BTC/USDT'
 * @property timeframe - Candle interval string, e.g. '5m'
 * @property candles - Number of final candles to return with indicators
 * @property buffer - Additional candles to fetch for indicator calculations (default 50)
 * @property indicators - Which indicators to calculate and their parameters
 */
interface OHLCVComponentConfig {
  description: string
  exchange: string
  symbol: string
  timeframe: string
  candles: number
  buffer?: number
  indicators?: {
    sma?: IndicatorConfig
    ema?: IndicatorConfig
    rsi?: IndicatorConfig
    macd?: MACDIndicatorConfig
    atr?: IndicatorConfig
    bbands?: BBandsIndicatorConfig
  }
}

/**
 * Default configuration values for OHLCVComponent if not overridden.
 */
const defaultConfig: OHLCVComponentConfig = {
  description: '',
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  candles: 100,
  buffer: 50,
  indicators: {},
}

/**
 * Content component that fetches OHLCV data and computes technical indicators.
 * Merges user config with defaults, retrieves data via CCXT, calculates indicators,
 * trims to the requested number of candles, and returns JSON.
 */
export class OHLCVComponent extends BaseContentComponent<OHLCVComponentConfig> {
  /**
   * Create a new OHLCVComponent.
   * @param config Partial configuration to override defaults.
   * @param exchangeFactory Factory creating ccxt exchange instances. Defaults to new exchange by exchange name.
   * @param indicatorsFactory Factory creating an Indicators instance. Defaults to new Indicators().
   */
  constructor(
    config: Partial<OHLCVComponentConfig> = {},
    private readonly exchangeFactory: (exchange: string) => any = (
      exchange: string,
    ) => {
      const CCXT = ccxt as any
      return new CCXT[exchange]()
    },
    private readonly indicatorsFactory: () => Indicators = () =>
      new Indicators(),
  ) {
    const merged = { ...defaultConfig, ...config }
    super(merged.description, merged)
  }

  /**
   * Fetches OHLCV data plus indicators and returns a JSON string.
   * @returns A promise resolving to a JSON string with candle data and indicators.
   */
  protected async generateContent(): Promise<string> {
    const exchange = this.exchangeFactory(this.config.exchange)
    await exchange.fetchMarkets()

    // Retrieve raw candles (candles + buffer)
    const fetchCount = this.config.candles + (this.config.buffer ?? 50)
    const rawOHLCV: any[] = await exchange.fetchOHLCV(
      this.config.symbol,
      this.config.timeframe,
      undefined,
      fetchCount,
    )

    // Convert to readable format
    const candles = rawOHLCV.map((c) => {
      const [ts, open, high, low, close, volume] = c
      return {
        time: new Date(ts).toISOString(),
        open,
        high,
        low,
        close,
        volume,
      }
    })

    // Determine precision for price rounding
    let priceDecimals: number
    const marketInfo = exchange.markets[this.config.symbol]
    if (
      marketInfo?.precision?.price !== undefined &&
      typeof marketInfo.precision.price === 'number'
    ) {
      const p = marketInfo.precision.price
      priceDecimals =
        p >= 1 && Number.isInteger(p) ? p : new Decimal(p).decimalPlaces()
    } else {
      const sample = candles[0]?.close
      priceDecimals =
        sample && sample.toString().split('.')[1]
          ? sample.toString().split('.')[1].length
          : 4
    }

    // Price arrays for indicators
    const closePrices = candles.map((c) => c.close)
    const highPrices = candles.map((c) => c.high)
    const lowPrices = candles.map((c) => c.low)
    // Scale factor for small-price assets to improve numeric stability in ATR
    const scaleFactor = closePrices[0] < 1 ? Math.pow(10, priceDecimals) : 1
    // Pre-scaled arrays for ATR
    const scaledHighPrices = highPrices.map((p) => p * scaleFactor)
    const scaledLowPrices = lowPrices.map((p) => p * scaleFactor)
    const scaledClosePrices = closePrices.map((p) => p * scaleFactor)

    const ta = this.indicatorsFactory()

    // Container for calculated values
    const computed: {
      sma?: number[]
      ema?: number[]
      rsi?: number[]
      macd?: { macd: number[]; signal: number[]; hist: number[] }
      atr?: number[]
      bbands?: { lower: number[]; middle: number[]; upper: number[] }
    } = {}

    // SMA
    if (this.config.indicators?.sma) {
      const vals = await ta.sma(
        closePrices,
        this.config.indicators!.sma!.period,
      )
      computed.sma = vals
    }

    // EMA
    if (this.config.indicators?.ema) {
      const vals = await ta.ema(
        closePrices,
        this.config.indicators!.ema!.period,
      )
      computed.ema = vals
    }

    // RSI
    if (this.config.indicators?.rsi) {
      const vals = await ta.rsi(
        closePrices,
        this.config.indicators!.rsi!.period,
      )
      computed.rsi = vals
    }

    // MACD
    if (this.config.indicators?.macd) {
      const { short_period, long_period, signal_period } =
        this.config.indicators!.macd!
      const [m, s, h] = (await ta.macd(
        closePrices,
        short_period,
        long_period,
        signal_period,
        closePrices.length,
      )) as [number[], number[], number[]]
      computed.macd = { macd: m, signal: s, hist: h }
    }

    // ATR
    if (this.config.indicators?.atr) {
      const scaledVals = await ta.atr(
        scaledHighPrices,
        scaledLowPrices,
        scaledClosePrices,
        this.config.indicators!.atr!.period,
      )
      // Downscale results
      computed.atr = scaledVals.map((v) => v / scaleFactor)
    }

    // Bollinger Bands
    if (this.config.indicators?.bbands) {
      const { period, stddev } = this.config.indicators!.bbands!
      const [l, m, u] = (await ta.bbands(closePrices, period, stddev)) as [
        number[],
        number[],
        number[],
      ]
      computed.bbands = { lower: l, middle: m, upper: u }
    }

    // Help function for rounding
    const roundTo = (num: number, dec: number): number =>
      new Decimal(num).toDecimalPlaces(dec).toNumber()

    // Trim to the last `candles` entries
    const sliceStart = Math.max(candles.length - this.config.candles, 0)
    const trimmedCandles = candles.slice(sliceStart)

    const trimmed: any[] = []
    for (let i = 0; i < trimmedCandles.length; i++) {
      const entry: any = { time: trimmedCandles[i]!.time }

      if (computed.sma) {
        const arr = computed.sma.slice(-this.config.candles)
        entry.sma = roundTo(arr[i]!, priceDecimals)
      }
      if (computed.ema) {
        const arr = computed.ema.slice(-this.config.candles)
        entry.ema = roundTo(arr[i]!, priceDecimals)
      }
      if (computed.rsi) {
        const arr = computed.rsi.slice(-this.config.candles)
        entry.rsi = roundTo(arr[i]!, 2)
      }
      if (computed.macd) {
        const mArr = computed.macd.macd.slice(-this.config.candles)
        const sArr = computed.macd.signal.slice(-this.config.candles)
        const hArr = computed.macd.hist.slice(-this.config.candles)
        entry.macd = {
          macd: roundTo(mArr[i]!, priceDecimals),
          signal: roundTo(sArr[i]!, priceDecimals),
          hist: roundTo(hArr[i]!, priceDecimals),
        }
      }
      if (computed.atr) {
        const arr = computed.atr.slice(-this.config.candles)
        entry.atr = roundTo(arr[i]!, priceDecimals)
      }
      if (computed.bbands) {
        const lArr = computed.bbands.lower.slice(-this.config.candles)
        const mArr = computed.bbands.middle.slice(-this.config.candles)
        const uArr = computed.bbands.upper.slice(-this.config.candles)
        entry.bbands = {
          lower: roundTo(lArr[i]!, priceDecimals),
          middle: roundTo(mArr[i]!, priceDecimals),
          upper: roundTo(uArr[i]!, priceDecimals),
        }
      }

      trimmed.push(entry)
    }

    const result = {
      [this.config.timeframe]: {
        candles: trimmedCandles,
        indicators: trimmed,
      },
    }

    logger.debug(JSON.stringify(result))
    return JSON.stringify(result)
  }
}
