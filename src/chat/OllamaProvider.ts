import { ChatOllama, type ChatOllamaInput } from '@langchain/ollama'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ZodObject } from 'zod'
import { ChatBaseProvider } from './ChatBaseProvider.js'
import logger from '../logger.js'

const defaultConfig: ChatOllamaInput = {
  model: 'qwen2.5:latest',
  numCtx: 4096,
}

/**
 * OllamaProvider implements the ChatProvider interface using the Ollama LLM backend.
 * It supports plain-text invocation, structured output via Zod schemas, and streaming responses.
 */
export class OllamaProvider extends ChatBaseProvider {
  private readonly config: ChatOllamaInput
  protected chat: ChatOllama

  /**
   * Constructs a new OllamaProvider with optional configuration overrides.
   * @param config - Partial configuration for the ChatOllama instance (e.g., model name, context length).
   */
  constructor(config: Partial<ChatOllamaInput> = {}) {
    super()
    this.config = { ...defaultConfig, ...config }
    logger.debug(`OllamaProvider config=${JSON.stringify(this.config)}`)
    this.chat = new ChatOllama(this.config)
  }

  /**
   * Sends a prompt to Ollama with a Zod schema to enforce structured JSON output.
   * It applies JSON cleanup (quoting keys and string values) and attempts to parse to an object.
   * @param prompt - The text prompt to send to the LLM.
   * @param zodObject - A ZodObject describing the expected structure of the JSON output.
   * @returns A Promise resolving to the parsed object matching the schema.
   * @throws Error if JSON parsing fails.
   */
  protected override async invokeStructuredRaw(
    prompt: string,
    zodObject: ZodObject<any>,
  ): Promise<any> {
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
}
