# Chat

## Overview

The Chat system provides a unified way to interact with different Large Language Model (LLM) backends via a simple interface. At its core, there are two main components:

- **ChatProvider**: An interface defining methods for sending prompts to an LLM, receiving plain or structured output, streaming responses and optional web search.
- **ChatBaseProvider**: Abstract base class implementing common `ChatProvider` functionality including Zod validation.
- **ChatClient**: A wrapper around a `ChatProvider` implementation that exposes user-friendly methods for invoking prompts and handling streaming.

By implementing the `ChatProvider` interface for different LLM backends (e.g., OpenAI, Ollama), you can swap out providers without changing the rest of your application code.

## ChatProvider Interface

The `ChatProvider` interface defines four methods:

```ts
/**
 * ChatProvider defines the interface for chat-based LLM backends.
 * Implementations should provide methods for plain invocation, structured output, and streaming.
 */
export interface ChatProvider {
  /**
   * Sends a plain-text prompt to the LLM backend.
   * @param prompt - The prompt string to send to the model.
   * @returns A Promise that resolves to the LLM's MessageContent response.
   */
  invoke(prompt: string): Promise<MessageContent>

  /**
   * Sends a prompt to the LLM backend with an expected Zod schema for structured JSON output.
   * @param prompt - The prompt string to send to the model.
   * @param zodObject - The Zod schema representing the expected structure of the JSON response.
   * @returns A Promise that resolves to a plain object matching the provided schema.
   */
  invokeWithStructuredOutput(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<{ [key: string]: any }>

  /**
   * Streams the LLM's response token-by-token as an async iterable.
   * @param prompt - The prompt string to send to the model.
   * @yields Objects containing a `content` string for each streamed chunk.
   */
  stream(prompt: string): AsyncIterable<{ content: string }>

  /**
   * Performs the prompt with additional web search tools enabled.
   * @param prompt - The query to run.
   * @param config - Provider specific tool configuration.
   */
  websearch(prompt: string, config?: any): Promise<MessageContent>
}
```

## Example Usage

Below is an example showing how to use `ChatClient` with `OpenAIProvider` implementation.

```ts
import { ChatPostProcessor, OpenAIProvider } from 'modktx'
import { z } from 'zod'

// 1. Create a provider instance (e.g., OpenAIProvider with default config).
const openAIProvider = new OpenAIProvider({ model: 'gpt-4o' })

// 2. Wrap it in a ChatClient.
const chatClient = new ChatClient(openAIProvider)

// 3. Simple text invocation.
async function askSimpleQuestion() {
  const prompt = 'Tell me a fun fact about space.'
  const response = await chatClient.invoke(prompt)
  console.log('LLM Response:', response)
}

// 4. Structured output using Zod schema.
const factSchema = z.object({
  fact: z.string(),
  source: z.string().url(),
})

async function askStructuredQuestion() {
  const prompt = 'Provide a JSON object with a space fact and a source URL.'
  try {
    const data = await chatClient.invokeWithStructuredOutput(prompt, factSchema)
    console.log('Structured Data:', data)
  } catch (err) {
    console.error('Failed to get structured output:', err)
  }
}

// 5. Streaming example.
async function streamAnswer() {
  const prompt = 'Write a short poem about the ocean.'
  await chatClient.streamToStdout(prompt)
}

// Run examples
askSimpleQuestion()
askStructuredQuestion()
streamAnswer()
```

You can also use a provider directly without the `ChatClient` wrapper:

```ts
const provider = new OpenAIProvider({ model: 'gpt-4o-mini' })
const res = await provider.invoke('Hello world')
```

### Web search configuration

The `websearch` method enables provider specific search tools. Configuration can be supplied at call time:

```ts
let chatClient = new ChatClient(new OpenAIProvider())
// OpenAI search context size can be overridden
const ans = await chatClient.websearch('Latest news', { search_context_size: 'large' })

// Providers can also be used directly
const gpt = new GoogleAIProvider()
const res = await gpt.websearch('Bitcoin price?', { googleSearch: { topN: 5 } })
```
