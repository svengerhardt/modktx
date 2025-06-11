# Post Processors

Post-processors transform or refine the output of content components. They operate on structured or textual output and are commonly used for formatting, filtering, or further transformation steps.

## OHLCVCSVFormatter

### Purpose

`OHLCVCSVFormatter` is a post-processor that transforms OHLCV (Open, High, Low, Close, Volume) candle data and optional technical indicators from a JSON format into a compact CSV representation.

This component is suitable for exporting trading data in a tabular format for visualization, analysis in spreadsheets, or import into other data tools.

### Input Format

- The input must be a **JSON string** with a single top-level key (e.g., `"5m"`), mapping to an object containing:
  - `candles`: An array of OHLCV candle objects
  - `indicators`: An array of indicator objects aligned by time with the candles

### Output Format

- A **CSV string** with the following characteristics:
  - Includes OHLCV columns only for fields present in the input (e.g., `time`, `open`, `high`, `low`, `close`, `volume`)
  - Includes only those technical indicator columns that are present in the input:
    - `sma`
    - `ema`
    - `rsi`
    - `macd, signal, hist`
    - `atr`
    - `bbLower, bbMiddle, bbUpper`
  
### Supported Indicators per Row

If present, the following indicators are added to each row (after OHLCV):

- `sma`: Simple Moving Average
- `ema`: Exponential Moving Average
- `rsi`: Relative Strength Index
- `macd`: MACD line
- `signal`: MACD signal line
- `hist`: MACD histogram
- `atr`: Average True Range
- `bbLower`: Lower Bollinger Band
- `bbMiddle`: Middle Bollinger Band (usually SMA)
- `bbUpper`: Upper Bollinger Band

### Example

```ts
new OHLCVComponent({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '5m',
    candles: 100,
    indicators: {
      sma: { period: 20 },
      ema: { period: 9 },
      rsi: { period: 14 },
      atr: { period: 14 },
      macd: { short_period: 12, long_period: 26, signal_period: 9 },
      bbands: { period: 20, stddev: 2 }
    }
})
  .postProcess(
    new OHLCVCSVFormatter(),
  )
```

**Output CSV:**

```
time,open,high,low,close,volume,sma,ema,rsi,macd,signal,hist,atr,bbLower,bbMiddle,bbUpper
2025-06-09T07:35:00.000Z,105583.52,105604.66,105560.39,105592.36,7.42627,105541.19,105567.17,56.54,22.74,22.66,0.08,53.48,105370.38,105541.19,105712.01
2025-06-09T07:40:00.000Z,105592.37,105592.37,105570.13,105570.14,5.83122,105549.73,105567.77,53.97,21.68,22.47,-0.78,51.25,105391.51,105549.73,105707.95
...
```

## JsonProjectionFilter

### Purpose

`JsonProjectionFilter` is a JSON filter that post-processes structured JSON content by:

- Preserving the overall structure of the input JSON,
- Traversing deeply nested objects and arrays,
- Retaining only the keys specified in a given `projection` schema,
- Optionally applying a limit to the number of items kept in any arrays.

It is especially suitable for narrowing down large and deeply nested JSON datasets to relevant fields for downstream use.

### Configuration

This post-processor is constructed via its class constructor rather than a configuration object, but it accepts the following parameters:

| Parameter    | Type         | Required | Default     | Description                                                                                       |
| ------------ | ------------ | -------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `projection` | `Projection` | Yes      | –           | An object that specifies which keys to keep. Keys can map to `true` or nested projection objects. |
| `limit`      | `number`     | No       | `undefined` | If set, limits the number of entries in all arrays (keeps the last `N` items).                    |

#### Projection Type

```ts
type Projection = {
  [key: string]: true | Projection
}
```

Each key in the projection object may be:

- `true`: include the entire matching field value,
- another projection: recursively apply projection rules to a nested object.

### Example

```ts
new OHLCVComponent({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1d',
    candles: 2,
    indicators: {
      rsi: { period: 14 },
      atr: { period: 14 },
      macd: { short_period: 12, long_period: 26, signal_period: 9 },
      bbands: { period: 20, stddev: 2 }
    }
})
  .postProcess(
    new JsonProjectionFilter({
      time: true,
      close: true,
      rsi: true,
    }),
  )
```

**Output JSON:**

```
{
    "1d": {
        "candles": [
            {
                "time": "2025-06-04T00:00:00.000Z",
                "close": 104696.86
            },
            {
                "time": "2025-06-05T00:00:00.000Z",
                "close": 104646.53
            }
        ],
        "indicators": [
            {
                "time": "2025-06-04T00:00:00.000Z",
                "rsi": 51.77
            },
            {
                "time": "2025-06-05T00:00:00.000Z",
                "rsi": 51.6
            }
        ]
    }
}
```

## ChatPostProcessor

### Purpose

`ChatPostProcessor` is a post-processor that uses a chat-based AI model to refine or transform textual content. It prepends a configurable prompt to the input content, sends the resulting message to a chat provider, and returns the AI-generated response.

This processor is particularly suitable for use cases such as rephrasing, summarizing, translating, or enforcing stylistic rules on generated text.

### Configuration

This post-processor is initialized with:

| Parameter  | Type           | Required | Description                                                 |
| ---------- | -------------- | -------- | ----------------------------------------------------------- |
| `prompt`   | `string`       | Yes      | A prompt string that guides the AI's behavior.              |
| `provider` | `ChatProvider` | Yes      | The chat provider instance used to communicate with the AI. |

### Behavior

- The content passed into `ChatPostProcessor` is treated as the user message.
- The provided prompt is added as a preceding system message.
- The combined message is sent to the configured `ChatProvider`.
- The AI's reply is returned as the processed output.

### Example

```ts
new TextComponent(
  'Please write a professional summary of the following content...',
)
  .postProcess(
    new ChatPostProcessor(
      'You are a helpful assistant that rewrites content in a formal and concise manner.',
      new OpenAIChatProvider({ model: 'gpt-4o' }),
    ),
  )
```

## PlaceholderPostProcessor

### Purpose

`PlaceholderPostProcessor` replaces placeholders in the format `{{key}}` with the matching value from a provided map. Supported keys may include letters, numbers, dots (`.`), dashes (`-`), underscores (`_`), and at signs (`@`).

Placeholders are evaluated after all content components have completed execution.

### Configuration

This processor is constructed with:

| Parameter      | Type             | Required | Description                        |
| -------------- | ---------------- | -------- | ---------------------------------- |
| `placeholders` | `PlaceholderMap` | Yes      | Map of placeholder keys to values.  |

### Example

```ts
new TextComponent('Hello {{user.name}}! Your email is {{email@domain}}.')
  .postProcess(
    new PlaceholderPostProcessor({
      'user.name': 'Alice',
      'email@domain': 'alice@example.com',
    }),
  )
```

**Output:** `Hello Alice! Your email is alice@example.com.`
