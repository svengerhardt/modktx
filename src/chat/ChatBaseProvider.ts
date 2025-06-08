import type { MessageContent } from '@langchain/core/messages'
import { ZodObject } from 'zod'
import type { ChatProvider } from './ChatProvider.js'

/**
 * ChatBaseProvider implements common ChatProvider functionality such as
 * simple invocation, streaming and Zod based validation for structured output.
 * Specific providers only need to implement creation of the underlying chat
 * model and the provider specific structured output and websearch logic.
 */
export abstract class ChatBaseProvider implements ChatProvider {
  protected abstract chat: any

  /**
   * Invokes the underlying chat model with the given prompt.
   */
  async invoke(prompt: string): Promise<MessageContent> {
    const result = await this.chat.invoke(prompt)
    return result.content
  }

  /**
   * Internal hook returning the raw structured result from the provider
   * without any validation applied.
   */
  protected abstract invokeStructuredRaw(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<any>

  /**
   * Invokes the provider expecting structured output. The result will be
   * validated using the provided Zod schema.
   */
  async invokeWithStructuredOutput(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<{ [p: string]: any }> {
    const raw = await this.invokeStructuredRaw(prompt, zodObject)
    const validated = zodObject.safeParse(raw)
    if (!validated.success) {
      throw new Error(`Zod validation failed: ${validated.error.format()}`)
    }
    return validated.data
  }

  /**
   * Streams the LLM response as an async iterable.
   */
  async *stream(prompt: string): AsyncIterable<{ content: string }> {
    const stream = await this.chat.stream(prompt)
    for await (const chunk of stream) {
      yield { content: `${chunk.content}` }
    }
  }

  /**
   * Optional websearch support. Providers should override this method to
   * implement their tooling configuration.
   */
  async websearch(prompt: string, _config?: any): Promise<MessageContent> {
    throw new Error('Websearch is not supported by this provider')
  }
}
