import { encoding_for_model, type TiktokenModel } from 'tiktoken'

/**
 * A collection of static utility functions for content processing.
 */
export class ContentUtils {
  /**
   * Counts the number of words in the provided text.
   *
   * @param text - The input string whose words should be counted.
   * @returns The number of words in the text. Splits on whitespace.
   */
  static wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  /**
   * Counts the number of characters in the provided text.
   *
   * @param text - The input string whose characters should be counted.
   * @returns The total number of characters in the text.
   */
  static charCount(text: string): number {
    return text.length
  }

  /**
   * Counts the number of tokens in the provided prompt using the specified Tiktoken model.
   *
   * @param prompt - The input string to encode and count tokens for.
   * @param model - The TiktokenModel to use for encoding. Defaults to 'gpt-4o'.
   * @returns The number of tokens encoded from the prompt.
   */
  static tokenCount(prompt: string, model: TiktokenModel = 'gpt-4o'): number {
    const enc = encoding_for_model(model)
    const tokens = enc.encode(prompt)
    enc.free()
    return tokens.length
  }
}
