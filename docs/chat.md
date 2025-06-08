# LLM Abstraction Interface

## Overview

This module defines a unified interface for working with Large Language Model (LLM) backends. It abstracts the differences between providers such as OpenAI and Ollama, offering a consistent API for interacting with LLMs.

There are three main components:

- **ChatProvider**: An interface that standardizes how to send prompts and receive responses from any LLM backend. It supports plain-text responses, structured JSON output using Zod schemas, streaming responses, and optional web-based enhancements.
- **ChatBaseProvider**: A base class that implements shared functionality for `ChatProvider` implementations, including input validation and common utilities.
- **ChatClient**: A high-level wrapper around a `ChatProvider` instance, providing ergonomic methods for invoking prompts and handling streaming responses.

By implementing the `ChatProvider` interface, different LLM providers can be integrated seamlessly, allowing easy swapping and extension without modifying application logic.

## Provider Interface (`ChatProvider`)

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

### Web search configuration

The `websearch` method enables provider specific search tools. Configuration can be supplied at call time:

```ts
let chatClient = new ChatClient(new OpenAIProvider())
const res = await chatClient.websearch('Latest news', { search_context_size: 'large' })
```
