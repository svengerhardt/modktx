import type { MessageContent } from '@langchain/core/messages'
import { ChatOpenAI, type ChatOpenAIFields } from '@langchain/openai'
import { ZodObject } from 'zod'
import { ChatBaseProvider } from './ChatBaseProvider.js'
import logger from '../logger.js'

const defaultConfig: ChatOpenAIFields = {
  model: 'gpt-4o',
}

/**
 * OpenAIProvider implements the ChatProvider interface using the OpenAI backend.
 * It supports plain-text invocation, structured output via Zod schemas, and streaming responses.
 */
export class OpenAIProvider extends ChatBaseProvider {
  private config: ChatOpenAIFields
  protected chat: ChatOpenAI
  private websearchDefaults: any = { search_context_size: 'medium' }

  /**
   * Constructs a new OpenAIProvider with optional configuration overrides.
   * @param config - Partial configuration for the ChatOpenAI instance (e.g., model name).
   */
  constructor(config: Partial<ChatOpenAIFields & { websearch?: any }> = {}) {
    super()
    const { websearch, ...chatConfig } = config
    this.config = { ...defaultConfig, ...chatConfig }
    if (websearch)
      this.websearchDefaults = { ...this.websearchDefaults, ...websearch }
    logger.debug(`OpenAIProvider config=${JSON.stringify(this.config)}`)
    this.chat = new ChatOpenAI(this.config)
  }

  protected override async invokeStructuredRaw(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<any> {
    const structuredLlm = this.chat.withStructuredOutput(zodObject)
    return await structuredLlm.invoke(prompt)
  }

  /**
   * TODO
   * https://platform.openai.com/docs/guides/tools-web-search
   * @param prompt
   */
  override async websearch(
    prompt: string,
    config: any = {},
  ): Promise<MessageContent> {
    const tool = {
      type: 'web_search_preview',
      ...this.websearchDefaults,
      ...config,
    }
    const llmWithTools = this.chat.bindTools([tool])
    const response = await llmWithTools.invoke(prompt)
    const content = response.content
    if (Array.isArray(content)) {
      // we assume that each element is a { text: string }
      return content
        .map((block: any) => block.text ?? '')
        .filter((txt: string) => txt.length > 0)
        .join('\n\n')
    } else {
      // content is already a string
      return content
    }
  }
}
