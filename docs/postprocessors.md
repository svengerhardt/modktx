# Post Processors

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
  - Always includes OHLCV columns: `time, open, high, low, close, volume`
  - Includes only the technical indicator columns present in the input:
    - `sma`
    - `ema`
    - `rsi`
    - `macd, signal, hist`
    - `atr`
    - `bbLower, bbMiddle, bbUpper`
  - Rows are aligned by `time`, and missing values are represented as empty fields.

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
new ContentPostProcessor(
  new OHLCVComponent({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1d',
    inputCandles: 60,
    outputCandles: 10,
    indicators: {
      sma: { period: 20 },
      rsi: { period: 14 },
      bbands: { period: 20, stddev: 2 },
    },
  }),
  new OHLCVCSVFormatter(),
)
```

**Output CSV:**

```
time,open,high,low,close,volume,sma,rsi,bbLower,bbMiddle,bbUpper
2025-05-27T00:00:00.000Z,109434.78,110718,107516.57,108938.17,21276.65635,105900,65.77,100600,105900,111300
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
new ContentPostProcessor(
  new OHLCVComponent({
    exchange: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1d',
    inputCandles: 60,
    outputCandles: 2,
    indicators: {
      sma: { period: 20 },
      rsi: { period: 14 },
      bbands: { period: 20, stddev: 2 },
    },
  }),
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
new ContentPostProcessor(
  new TextComponent(
    'Please write a professional summary of the following content...',
  ),
  new ChatPostProcessor(
    'You are a helpful assistant that rewrites content in a formal and concise manner.',
    new OpenAIChatProvider({ model: 'gpt-4o' }),
  ),
)
```

## PlaceholderPostProcessor

### Purpose

`PlaceholderPostProcessor` replaces placeholders in the format `{{key}}` with the matching value from a provided map.

### Configuration

This processor is constructed with:

| Parameter      | Type                     | Required | Description                         |
| -------------- | ------------------------ | -------- | ----------------------------------- |
| `placeholders` | `Record<string, string>` | Yes      | Map of placeholder names to values. |

### Example

```ts
new ContentPostProcessor(
  new TextComponent('Hello {{name}}!'),
  new PlaceholderPostProcessor({ name: 'Alice' }),
)
```

**Output:** `Hello Alice!`
