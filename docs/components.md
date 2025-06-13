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

### RESTComponent

#### Purpose
`RESTComponent` performs HTTP requests to external REST APIs and returns the
response. It supports multiple authentication schemes (none, API‑Key, Basic,
Bearer, JWT) and allows full parameterisation of the request. The component can be used to pull live data from third‑party services for
inclusion in a content pipeline.

#### Configuration

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `description` | `string` | No | `''` | Short explanation of the component’s role. |
| `url` | `string` | **Yes** | – | Target endpoint URL. |
| `method` | `string` | No | `'GET'` | HTTP verb (`GET`, `POST`, `PUT`, …). |
| `params` | `object` | No | `{}` | Query‑string parameters. |
| `data` | `any` | No | `null` | Request body (ignored for `GET`). |
| `headers` | `object` | No | `{}` | Additional HTTP headers. |
| `timeout` | `number` | No | `10000` | Timeout in ms. |
| `auth` | `object` | No | `{ type: 'none' }` | Authentication descriptor (see below). |

**Auth sub‑types**

```ts
// Exactly one of the following objects can be provided
{ type: 'none' }

{ type: 'apiKey', value: string, name?: string,
  location?: 'header' | 'query' }

{ type: 'basic', value: string } // pre‑encoded
{ type: 'basic', username: string, password: string } // raw creds

{ type: 'bearer', value: string } // OAuth token

{ type: 'jwt', token?: string, username?: string, password?: string,
  tokenEndpoint?: string } // automatic login & refresh
```

*Notes*  
* JWT tokens are auto‑refreshed when they are within 60 seconds of expiry.  
* API‑Keys can be placed either in a header (default **`x-api-key`**) or as a
  query parameter.

#### Example

```typescript
new RESTComponent({
  description: 'Fetch all trades',
  url: 'https://example.com/api/v1/trades',
  method: 'GET',
  timeout: 5000,
  auth: {
    type: 'jwt',
    username: 'user',
    password: 'user'
  }
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
  candles: 100,
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
| `candles`         | `number`                 | Yes      | `100`       | Number of final candles to return with indicators. |
| `buffer`          | `number`                 | No       | `50`        | Additional candles to fetch for indicator calculations (default 50). |
| `indicators`      | `object`     | No       | -           | Configuration for optional technical indicators (see below). |

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
        "time": "2025-06-09T15:40:00.000Z",
        "open": 107760.73,
        "high": 107767.06,
        "low": 107708.4,
        "close": 107719.99,
        "volume": 23.74751
      },
      {
        "time": "2025-06-09T15:45:00.000Z",
        "open": 107720,
        "high": 107813.94,
        "low": 107720,
        "close": 107767.45,
        "volume": 19.19103
      }
    ],
    "indicators": [
      {
        "time": "2025-06-09T15:40:00.000Z",
        "sma": 107699.52,
        "ema": 107777.21,
        "rsi": 51.97,
        "macd": {
          "macd": 73.67,
          "signal": 67.94,
          "hist": 5.72
        },
        "atr": 165.37,
        "bbands": {
          "lower": 107366.7,
          "middle": 107699.52,
          "upper": 108032.35
        }
      },
      {
        "time": "2025-06-09T15:45:00.000Z",
        "sma": 107724.22,
        "ema": 107775.26,
        "rsi": 53.72,
        "macd": {
          "macd": 68.89,
          "signal": 68.13,
          "hist": 0.76
        },
        "atr": 160.27,
        "bbands": {
          "lower": 107454.08,
          "middle": 107724.22,
          "upper": 107994.35
        }
      }
    ]
  }
}
```