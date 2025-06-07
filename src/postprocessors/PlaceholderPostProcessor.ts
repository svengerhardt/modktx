import type { PostProcessor } from './PostProcessor.js'

type PlaceholderValue = string | number | boolean | null | undefined
type PlaceholderMap = Record<string, PlaceholderValue>

/**
 * PlaceholderPostProcessor replaces placeholders in the form `{{key}}`
 * with their corresponding values from a provided map.
 */
export class PlaceholderPostProcessor implements PostProcessor {
  private readonly placeholders: PlaceholderMap

  /**
   * Creates a new instance of the PlaceholderPostProcessor.
   * @param placeholders - A map of placeholder keys and their corresponding replacement values.
   */
  constructor(placeholders: PlaceholderMap) {
    this.placeholders = placeholders
  }

  /**
   * Replaces all placeholders in the content string with values from the placeholder map.
   * Placeholders must be in the format {{key}}, where `key` can include letters, numbers, dots, dashes, and underscores.
   * Leading and trailing whitespace inside the placeholder is ignored.
   * If a key is not found in the map, the placeholder remains unchanged.
   *
   * @param content - The string content containing placeholders to be processed.
   * @returns A Promise that resolves to the processed content with placeholders replaced.
   */
  async postProcess(content: string): Promise<string> {
    return content.replace(/{{\s*([A-Za-z0-9._\-@]+)\s*}}/g, (_, key) => {
      const value = this.placeholders[key]
      return value != null ? String(value) : `{{${key}}}`
    })
  }
}
