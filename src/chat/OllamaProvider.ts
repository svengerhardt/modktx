import type { MessageContent } from '@langchain/core/messages'
import { ChatOllama, type ChatOllamaInput } from '@langchain/ollama'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ChatProvider } from './ChatProvider.js'
import logger from '../logger.js'
import { ZodObject } from 'zod'

const defaultConfig: ChatOllamaInput = {
  model: 'qwen2.5:latest',
  numCtx: 4096,
}

/**
 * OllamaProvider implements the ChatProvider interface using the Ollama LLM backend.
 * It supports plain-text invocation, structured output via Zod schemas, and streaming responses.
 */
export class OllamaProvider implements ChatProvider {
  private config: ChatOllamaInput
  private chat: ChatOllama

  /**
   * Constructs a new OllamaProvider with optional configuration overrides.
   * @param config - Partial configuration for the ChatOllama instance (e.g., model name, context length).
   */
  constructor(config: Partial<ChatOllamaInput> = {}) {
    this.config = { ...defaultConfig, ...config }
    logger.debug(`OllamaProvider config=${JSON.stringify(this.config)}`)
    this.chat = new ChatOllama(this.config)
  }

  /**
   * Sends a plain-text prompt to the Ollama chat model and returns the raw message content.
   * @param prompt - The text prompt to send to the LLM.
   * @returns A Promise resolving to the MessageContent returned by the model.
   */
  async invoke(prompt: string): Promise<MessageContent> {
    const response = await this.chat.invoke(prompt)
    return response.content
  }

  /**
   * Sends a prompt to Ollama with a Zod schema to enforce structured JSON output.
   * It applies JSON cleanup (quoting keys and string values) and attempts to parse to an object.
   * @param prompt - The text prompt to send to the LLM.
   * @param zodObject - A ZodObject describing the expected structure of the JSON output.
   * @returns A Promise resolving to the parsed object matching the schema.
   * @throws Error if JSON parsing fails.
   */
  async invokeWithStructuredOutput(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<{ [p: string]: any }> {
    this.chat.format = zodToJsonSchema(zodObject)
    let result = await this.chat.invoke(prompt)

    const fixed = result.content
      .toString()
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Keys in quotation marks
      .replace(/:\s*'([^']+)'/g, ': "$1"') // String values in quotation marks

    try {
      return JSON.parse(fixed)
    } catch (err) {
      throw new Error(`Could not parse the LLM output: ${err}`)
    }
  }

  /**
   * Streams the response from Ollama token-by-token as an async iterable.
   * @param prompt - The text prompt to send to the LLM.
   * @yields Chunks of the response as objects with a `content` string property.
   */
  async *stream(prompt: string): AsyncIterable<{ content: string }> {
    const stream = await this.chat.stream(prompt)
    for await (const chunk of stream) {
      yield { content: `${chunk.content}` }
    }
  }

  /**
   * TODO
   * @param prompt
   */
  async websearch(prompt: string): Promise<MessageContent> {
    throw new Error(`Not supported yet!`)
  }
}
