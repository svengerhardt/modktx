import type { MessageContent } from '@langchain/core/messages'
import { ChatOpenAI, type ChatOpenAIFields } from '@langchain/openai'
import type { ChatProvider } from './ChatProvider.js'
import { ZodObject } from 'zod'
import logger from '../logger.js'

const defaultConfig: ChatOpenAIFields = {
  model: 'gpt-4o',
}

/**
 * OpenAIProvider implements the ChatProvider interface using the OpenAI backend.
 * It supports plain-text invocation, structured output via Zod schemas, and streaming responses.
 */
export class OpenAIProvider implements ChatProvider {
  private config: ChatOpenAIFields
  private chat: ChatOpenAI

  /**
   * Constructs a new OpenAIProvider with optional configuration overrides.
   * @param config - Partial configuration for the ChatOpenAI instance (e.g., model name).
   */
  constructor(config: Partial<ChatOpenAIFields> = {}) {
    this.config = { ...defaultConfig, ...config }
    logger.debug(`OpenAIProvider config=${JSON.stringify(this.config)}`)
    this.chat = new ChatOpenAI(this.config)
  }

  /**
   * Sends a plain-text prompt to the OpenAI chat model and returns the raw message content.
   * @param prompt - The text prompt to send to the LLM.
   * @returns A Promise resolving to the MessageContent returned by the model.
   */
  async invoke(prompt: string): Promise<MessageContent> {
    const response = await this.chat.invoke(prompt)
    return response.content
  }

  /**
   * Sends a prompt to OpenAI with a Zod schema to enforce structured JSON output.
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
   * Streams the response from OpenAI token-by-token as an async iterable.
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
   * https://platform.openai.com/docs/guides/tools-web-search
   * @param prompt
   */
  async websearch(prompt: string): Promise<MessageContent> {
    const llmWithTools = this.chat.bindTools([
      { type: 'web_search_preview', search_context_size: 'medium' },
    ])
    const response = await llmWithTools.invoke(prompt)
    const content = response.content;
    if (Array.isArray(content)) {
      // we assume that each element is a { text: string }
      return content
        .map((block: any) => block.text ?? '')
        .filter((txt: string) => txt.length > 0)
        .join('\n\n');
    } else {
      // content is already a string
      return content
    }
  }
}
