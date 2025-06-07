import type { MessageContent } from '@langchain/core/messages'
import {
  ChatGoogleGenerativeAI,
  type GoogleGenerativeAIChatInput,
} from '@langchain/google-genai'
import type { ChatProvider } from './ChatProvider.js'
import { ZodObject } from 'zod'
import logger from '../logger.js'

const defaultConfig: GoogleGenerativeAIChatInput = {
  model: 'gemini-2.0-flash',
}

/**
 * GoogleAIProvider implements the ChatProvider interface using the GoogleAI backend.
 * It supports plain-text invocation, structured output via Zod schemas, and streaming responses.
 */
export class GoogleAIProvider implements ChatProvider {
  private readonly config: GoogleGenerativeAIChatInput
  private chat: ChatGoogleGenerativeAI

  /**
   * Constructs a new GoogleAIProvider with optional configuration overrides.
   * @param config - Partial configuration for the ChatGoogleGenerativeAI instance (e.g., model name).
   */
  constructor(config: Partial<GoogleGenerativeAIChatInput> = {}) {
    this.config = { ...defaultConfig, ...config }
    logger.debug(`GoogleAIProvider config=${JSON.stringify(this.config)}`)
    this.chat = new ChatGoogleGenerativeAI(this.config)
  }

  /**
   * Sends a plain-text prompt to the GoogleAI chat model and returns the raw message content.
   * @param prompt - The text prompt to send to the LLM.
   * @returns A Promise resolving to the MessageContent returned by the model.
   */
  async invoke(prompt: string): Promise<MessageContent> {
    const response = await this.chat.invoke(prompt)
    return response.content
  }

  /**
   * Sends a prompt to GoogleAI with a Zod schema to enforce structured JSON output.
   * @param prompt - The text prompt to send to the LLM.
   * @param zodObject - A ZodObject describing the expected structure of the JSON output.
   * @returns A Promise resolving to the parsed object matching the schema.
   */
  async invokeWithStructuredOutput(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<{ [p: string]: any }> {
    const structuredLlm = this.chat.withStructuredOutput(zodObject)
    return await structuredLlm.invoke(prompt)
  }

  /**
   * Streams the response from GoogleAI token-by-token as an async iterable.
   * @param prompt - The text prompt to send to the LLM.
   * @yields Chunks of the response as objects with a `content` string property.
   */
  async *stream(prompt: string): AsyncIterable<{ content: string }> {
    const stream = await this.chat.stream(prompt)
    for await (const chunk of stream) {
      yield { content: `${chunk.content}` }
    }
  }
}
