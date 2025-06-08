import { type MessageContent } from '@langchain/core/messages'
import {
  ChatGoogleGenerativeAI,
  type GoogleGenerativeAIChatInput,
} from '@langchain/google-genai'
import { ZodObject } from 'zod'
import { ChatBaseProvider } from './ChatBaseProvider.js'
import logger from '../logger.js'

const defaultConfig: GoogleGenerativeAIChatInput = {
  model: 'gemini-2.0-flash',
}

/**
 * GoogleAIProvider implements the ChatProvider interface using the GoogleAI backend.
 * It supports plain-text invocation, structured output via Zod schemas, and streaming responses.
 */
export class GoogleAIProvider extends ChatBaseProvider {
  private readonly config: GoogleGenerativeAIChatInput
  protected chat: ChatGoogleGenerativeAI
  private websearchDefaults: any = { googleSearch: {} }

  /**
   * Constructs a new GoogleAIProvider with optional configuration overrides.
   * @param config - Partial configuration for the ChatGoogleGenerativeAI instance (e.g., model name).
   */
  constructor(
    config: Partial<GoogleGenerativeAIChatInput & { websearch?: any }> = {},
  ) {
    super()
    const { websearch, ...chatConfig } = config
    this.config = { ...defaultConfig, ...chatConfig }
    if (websearch)
      this.websearchDefaults = { ...this.websearchDefaults, ...websearch }
    logger.debug(`GoogleAIProvider config=${JSON.stringify(this.config)}`)
    this.chat = new ChatGoogleGenerativeAI(this.config)
  }

  /**
   * Sends a plain-text prompt to the GoogleAI chat model and returns the raw message content.
   * @param prompt - The text prompt to send to the LLM.
   * @returns A Promise resolving to the MessageContent returned by the model.
   */
  protected override async invokeStructuredRaw(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<any> {
    const structuredLlm = this.chat.withStructuredOutput(zodObject)
    return await structuredLlm.invoke(prompt)
  }

  /**
   * TODO
   * https://ai.google.dev/gemini-api/docs/grounding
   * @param prompt
   */
  override async websearch(
    prompt: string,
    config: any = {},
  ): Promise<MessageContent> {
    const tool = { ...this.websearchDefaults, ...config }
    const llmWithTools = this.chat.bindTools([tool])
    const result = await llmWithTools.invoke(prompt)
    return result.content
  }
}
