import type { PostProcessor } from './PostProcessor.js'

/**
 * PlaceholderPostProcessor replaces placeholders in the form `{{key}}`
 * with their corresponding values from a provided map.
 */
export class PlaceholderPostProcessor implements PostProcessor {
  private readonly placeholders: Record<string, string>

  constructor(placeholders: Record<string, string>) {
    this.placeholders = placeholders
  }

  async postProcess(content: string): Promise<string> {
    let result = content
    for (const [key, value] of Object.entries(this.placeholders)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`{{${escapedKey}}}`, 'g')
      result = result.replace(regex, value)
    }
    return result
  }
}
