import type { MessageContent } from '@langchain/core/messages'
import type { ChatProvider } from './ChatProvider.js'

/**
 * ChatClient is a wrapper around a ChatProvider that provides methods to invoke LLM prompts.
 */
export class ChatClient {
  private provider: ChatProvider

  /**
   * Constructs a new ChatClient with the given ChatProvider.
   * @param provider - The ChatProvider implementation to use for invoking the model.
   */
  constructor(provider: ChatProvider) {
    this.provider = provider
  }

  /**
   * Sleeps for a given number of milliseconds.
   * @param ms - Duration in milliseconds to sleep.
   * @returns A Promise that resolves after the given duration.
   */
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Invokes the provider with a plain text prompt.
   * @param prompt - The prompt string to send to the LLM.
   * @returns A Promise that resolves to the raw MessageContent from the provider.
   */
  async invoke(prompt: string): Promise<MessageContent> {
    return await this.provider.invoke(prompt)
  }

  /**
   * Invokes the provider with a prompt and parses the response according to the given Zod schema.
   * @param prompt - The prompt string to send to the LLM.
   * @param zodObject - A Zod schema object to validate and parse the structured output.
   * @returns A Promise that resolves to the parsed data matching the Zod schema.
   * @throws Error if the response fails Zod validation.
   */
  async invokeWithStructuredOutput(
    prompt: string,
    zodObject: any,
  ): Promise<{ [p: string]: any }> {
    return await this.provider.invokeWithStructuredOutput(prompt, zodObject)
  }

  /**
   * Streams the response from the provider to stdout character by character.
   * @param prompt - The prompt string to send to the LLM.
   * @returns A Promise that resolves once the stream completes.
   */
  async streamToStdout(prompt: string): Promise<void> {
    const stream = this.provider.stream(prompt)
    for await (const chunk of stream) {
      for (const char of chunk.content) {
        process.stdout.write(`${char}`)
        await this.sleep(10)
      }
    }
    console.log('')
  }

  /**
   * Performs the prompt with additional web search tools enabled.
   * @param prompt - The query to run.
   * @param config - Provider specific tool configuration.
   */
  async websearch(prompt: string, config?: any): Promise<MessageContent> {
    return await this.provider.websearch(prompt, config)
  }
}
