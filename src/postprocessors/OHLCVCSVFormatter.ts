import type { PostProcessor } from './PostProcessor.js'

/**
 * Represents a single OHLCV (Open, High, Low, Close, Volume) data point (candle).
 */
interface Candle {
  /** Timestamp of the candle in ISO 8601 format */
  time: string
  /** Opening price */
  open: number
  /** Highest price */
  high: number
  /** Lowest price */
  low: number
  /** Closing price */
  close: number
  /** Trading volume */
  volume: number
}

/**
 * Represents MACD (Moving Average Convergence Divergence) indicator values.
 */
interface MACD {
  /** MACD line value */
  macd?: number
  /** Signal line value */
  signal?: number
  /** MACD histogram value */
  hist?: number
}

/**
 * Represents Bollinger Bands indicator values.
 */
interface BBands {
  /** Lower Bollinger Band value */
  lower?: number
  /** Middle Bollinger Band (usually SMA) value */
  middle?: number
  /** Upper Bollinger Band value */
  upper?: number
}

/**
 * Represents a collection of technical indicators for a given timestamp.
 */
interface Indicator {
  /** Timestamp matching the corresponding candle */
  time: string
  /** Simple Moving Average */
  sma?: number
  /** Exponential Moving Average */
  ema?: number
  /** Relative Strength Index */
  rsi?: number
  /** Moving Average Convergence Divergence data */
  macd?: MACD
  /** Average True Range */
  atr?: number
  /** Bollinger Bands data */
  bbands?: BBands
}

/**
 * Represents the combined data payload for a specific time interval.
 * Contains an array of candles and an array of indicators.
 */
interface IntervalData {
  /** Array of OHLCV candles */
  candles?: Candle[]
  /** Array of technical indicators */
  indicators?: Indicator[]
}

/**
 * Post-processor that converts OHLCV JSON content into a compact CSV string.
 * Only includes columns for indicators actually present in the input.
 */
export class OHLCVCSVFormatter implements PostProcessor {
  /**
   * Takes a JSON string containing OHLCV and indicator data, and returns CSV-formatted text.
   * @param content - A JSON string with a single top-level key (e.g., "5m") mapping to IntervalData.
   * @returns CSV string with a header row followed by one line per candle.
   */
  async postProcess(content: string): Promise<string> {
    // Parse the incoming JSON to an object keyed by interval (e.g., "5m").
    const parsed = JSON.parse(content) as Record<string, IntervalData>
    const intervalKeys = Object.keys(parsed)

    // If there is no interval data, return an empty string.
    if (intervalKeys.length === 0) {
      return ''
    }

    // We expect only one interval (e.g., "5m"); extract it and its associated data.
    const interval = intervalKeys[0]!
    const data = parsed[interval]!

    // Extract candle and indicator arrays, defaulting to empty arrays if missing.
    const candles = data.candles || []
    const indicators = data.indicators || []

    // Determine which indicator fields are actually present in the input to build the CSV header.
    let hasSma = false
    let hasEma = false
    let hasRsi = false
    let hasMacd = false
    let hasAtr = false
    let hasBBands = false

    for (const ind of indicators) {
      if (ind.sma !== undefined) hasSma = true
      if (ind.ema !== undefined) hasEma = true
      if (ind.rsi !== undefined) hasRsi = true
      if (ind.macd !== undefined) hasMacd = true
      if (ind.atr !== undefined) hasAtr = true
      if (ind.bbands !== undefined) hasBBands = true
      // Break early if all possible indicators are found.
      if (hasSma && hasEma && hasRsi && hasMacd && hasAtr && hasBBands) {
        break
      }
    }

    // Build a lookup map from timestamp to Indicator object for quick access.
    const indicatorMap: Record<string, Indicator> = {}
    for (const ind of indicators) {
      indicatorMap[ind.time] = ind
    }

    // Construct the CSV header row, always including OHLCV fields, then only present indicators.
    const headerColumns: string[] = [
      'time',
      'open',
      'high',
      'low',
      'close',
      'volume',
    ]
    if (hasSma) headerColumns.push('sma')
    if (hasEma) headerColumns.push('ema')
    if (hasRsi) headerColumns.push('rsi')
    if (hasMacd) {
      headerColumns.push('macd', 'signal', 'hist')
    }
    if (hasAtr) headerColumns.push('atr')
    if (hasBBands) {
      headerColumns.push('bbLower', 'bbMiddle', 'bbUpper')
    }

    const lines: string[] = []
    // Push the header row as the first line.
    lines.push(headerColumns.join(','))

    // Iterate over each candle to create one CSV row per candle.
    for (const candle of candles) {
      // Base values: time and OHLCV.
      const rowValues: Array<string | number> = [
        candle.time,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
      ]

      // Only append indicator values if any indicators exist in the input.
      if (indicators.length > 0) {
        // Find indicator data for this candle's timestamp, or use an empty object if missing.
        const ind: Indicator = indicatorMap[candle.time] ?? ({} as Indicator)

        if (hasSma) {
          rowValues.push(ind.sma ?? '')
        }
        if (hasEma) {
          rowValues.push(ind.ema ?? '')
        }
        if (hasRsi) {
          rowValues.push(ind.rsi ?? '')
        }
        if (hasMacd) {
          // Use default empty MACD object to avoid undefined errors.
          const macdObj: MACD = ind.macd ?? {}
          rowValues.push(
            macdObj.macd ?? '',
            macdObj.signal ?? '',
            macdObj.hist ?? '',
          )
        }
        if (hasAtr) {
          rowValues.push(ind.atr ?? '')
        }
        if (hasBBands) {
          // Use default empty BBands object to avoid undefined errors.
          const bb: BBands = ind.bbands ?? {}
          rowValues.push(bb.lower ?? '', bb.middle ?? '', bb.upper ?? '')
        }
      }

      // Convert all values to strings, using an empty string for missing values, then join with commas.
      const line = rowValues
        .map((v) =>
          v !== '' && v !== undefined && v !== null ? v.toString() : '',
        )
        .join(',')
      lines.push(line)
    }

    // Join all lines with newline characters and return the complete CSV string.
    return lines.join('\n')
  }
}
