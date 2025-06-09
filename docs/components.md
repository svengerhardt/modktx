# Content Components

This section describes reusable components that produce structured content or data. These components can be combined and composed into larger processing pipelines. They include both static content (e.g., predefined messages) and dynamic data sources (e.g., real-time market data).
## Basic Components

### TextComponent

#### Purpose
`TextComponent` outputs static text content. It's useful for including predefined messages or constant strings.

#### Configuration

| Property      | Type     | Required | Default | Description                                       |
|---------------|----------|----------|---------|---------------------------------------------------|
| `description` | string   | No       | `''`    | A short explanation of the component’s role.  |
| `content`     | string   | No       | `''`    | The static text that will be returned.          |

#### Example

```ts
new TextComponent({
  description: 'Greeting text for the user',
  content: 'Hello! How can I help you today?'
})
```

## Trading

### OHLCVComponent

#### Purpose
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

#### Configuration

| Property         | Type                     | Required | Default     | Description |
|------------------|--------------------------|----------|-------------|-------------|
| `description`     | `string`                 | Yes      | –           | Template string for the output JSON description. |
| `exchange`        | `string`                 | Yes      | `binance`   | The name of the exchange to fetch data from (e.g., `"binance"`). |
| `symbol`          | `string`                 | Yes      | `BTC/USDT`  | The trading pair symbol (e.g., `"BTC/USDC"`). |
| `timeframe`       | `string`                 | Yes      | `1h`        | Timeframe of candles (e.g., `"1d"`, `"1h"`). |
| `inputCandles`    | `number`                 | Yes      | `150`       | Number of historical candles used to calculate indicators. |
| `outputCandles`   | `number`     | No       | `100`       | Number of recent entries to include in the final result (e.g., last 100 candles). |
| `indicators`      | `object`     | No       | -           | Configuration for optional technical indicators (see below). |
| `sigDigits`       | `number`     | No       | `4`         | Rounds indicator values to this number of significant digits. |

#### Supported Indicators

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

#### Example Output

Example output structure for the '5m' timeframe (time is in ISO format and data arrays are aligned chronologically):

```json
{
    "5m": {
        "candles": [
            {
                "time": "2025-06-09T08:35:00.000Z",
                "open": 105569.19,
                "high": 105753.34,
                "low": 105569.18,
                "close": 105712.53,
                "volume": 73.20564
            },
            {
                "time": "2025-06-09T08:40:00.000Z",
                "open": 105712.54,
                "high": 105712.54,
                "low": 105697.67,
                "close": 105697.68,
                "volume": 9.98961
            }
        ],
        "indicators": [
            {
                "time": "2025-06-09T08:35:00.000Z",
                "sma": 105600,
                "ema": 105600,
                "rsi": 63.83,
                "macd": {
                    "macd": 19.45,
                    "signal": 13.91,
                    "hist": 5.539
                },
                "atr": 57.88,
                "bbands": {
                    "lower": 105500,
                    "middle": 105600,
                    "upper": 105700
                }
            },
            {
                "time": "2025-06-09T08:40:00.000Z",
                "sma": 105600,
                "ema": 105600,
                "rsi": 61.93,
                "macd": {
                    "macd": 26.75,
                    "signal": 16.48,
                    "hist": 10.27
                },
                "atr": 54.8,
                "bbands": {
                    "lower": 105500,
                    "middle": 105600,
                    "upper": 105700
                }
            }
        ]
    }
}
```