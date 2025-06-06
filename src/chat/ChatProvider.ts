import { ZodObject } from 'zod'
import type { MessageContent } from '@langchain/core/messages'

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
  ): Promise<{ [p: string]: any }>
  /**
   * Streams the LLM's response token-by-token as an async iterable.
   * @param prompt - The prompt string to send to the model.
   * @yields Objects containing a `content` string for each streamed chunk.
   */
  stream(prompt: string): AsyncIterable<{ content: string }>
}
