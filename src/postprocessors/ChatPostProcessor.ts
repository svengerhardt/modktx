import type { PostProcessor } from './PostProcessor.js'
import type { ChatProvider } from '../chat/ChatProvider.js'
import { ChatClient } from '../chat/ChatClient.js'

/**
 * ChatPostProcessor is a post-processor that uses a chat provider to process content.
 *
 * It prepends a defined prompt to the input content, sends the combined message to a chat provider
 * via a ChatClient, and returns the processed output.
 */
export class ChatPostProcessor implements PostProcessor {
  private readonly prompt: string
  private readonly provider: ChatProvider

  /**
   * Creates an instance of ChatPostProcessor.
   *
   * @param {string} prompt - The prompt text that will be prepended to the input content.
   * @param {ChatProvider} provider - The chat provider used by the ChatClient to process the content.
   */
  constructor(prompt: string, provider: ChatProvider) {
    this.prompt = prompt
    this.provider = provider
  }

  /**
   * Processes the provided content by sending it along with the prompt to the chat provider.
   *
   * @param {string} content - The content to process.
   * @returns {Promise<string>} - A promise that resolves with the processed content as a string.
   */
  async postProcess(content: string): Promise<string> {
    const chatClient = new ChatClient(this.provider)
    let result = await chatClient.invoke(`${this.prompt}\n\n${content}`)
    return result.toString()
  }
}
