# Components

## TextComponent

### Purpose
`TextComponent` provides static text content, suitable for including a predefined or constant string.

### Configuration

| Property      | Type     | Required | Default | Description                                       |
|---------------|----------|----------|---------|---------------------------------------------------|
| `description` | string   | No       | `''`    | A short description of the component’s purpose.  |
| `content`     | string   | No       | `''`    | The static text content to be returned.          |

### Example

```ts
new TextComponent({
  description: 'Greeting text for the user',
  content: 'Hello! How can I help you today?'
})
```

## OHLCVComponent

### Purpose
`OHLCVComponent` fetches historical OHLCV (Open, High, Low, Close, Volume) market data from a cryptocurrency exchange using the `ccxt` library. It can also compute various technical indicators (e.g., SMA, EMA, RSI, MACD, ATR, Bollinger Bands) on the price data using the `@ixjb94/indicators` library.

The result is a JSON structure that includes both the raw OHLCV candles and the computed indicator values, aligned in time.

**Example:**

```typescript
new OHLCVComponent({
  description: 'Recent market data for {{symbol}}',
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  inputCandles: 150,
  outputCandles: 100,
  indicators: {
    sma: {period: 20},
    ema: {period: 9},
    rsi: {period: 14},
    atr: {period: 14},
    macd: { short_period: 12, long_period: 26, signal_period: 9 },
    bbands: {period: 20, stddev: 2}
  }
})
```

### Configuration

| Property         | Type                     | Required | Default     | Description |
|------------------|--------------------------|----------|-------------|-------------|
| `description`     | `string`                 | Yes      | –           | Template string for the output JSON description. |
| `exchange`        | `string`                 | Yes      | `binance`   | The name of the exchange to fetch data from (e.g., `"binance"`). |
| `symbol`          | `string`                 | Yes      | `BTC/USDT`  | The trading pair symbol (e.g., `"BTC/USDC"`). |
| `timeframe`       | `string`                 | Yes      | `1h`        | Timeframe of candles (e.g., `"1d"`, `"1h"`). |
| `inputCandles`    | `number`                 | Yes      | `150`       | Number of candles to fetch and use for indicator calculations. |
| `outputCandles`   | `number`     | No       | `100`       | Number of output entries in the final result. |
| `indicators`      | `object`     | No       | -           | Configuration for optional technical indicators (see below). |
| `sigDigits`       | `number`     | No       | `4`         | Rounds indicator values to this number of significant digits. |

### Supported Indicators

Each subfield under `indicators` configures one type of indicator. All are optional:

- **`sma`**: `{ period: number }`  
  Simple Moving Average over the given period.

- **`ema`**: `{ period: number }`  
  Exponential Moving Average over the given period.

- **`rsi`**: `{ period: number }`  
  Relative Strength Index over the given period.

- **`macd`**: `{ short_period: number, long_period: number, signal_period: number }`  
  Moving Average Convergence Divergence.

- **`atr`**: `{ period: number }`  
  Average True Range.

- **`bbands`**: `{ period: number, stddev: number }`  
  Bollinger Bands, using specified period and standard deviation.
