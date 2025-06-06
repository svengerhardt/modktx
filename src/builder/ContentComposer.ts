import type { ContentComponent } from '../components/ContentComponent.js'

/**
 * ContentComposer assembles content from various ContentComponent instances,
 * allowing optional start and end text. It composes the final content string.
 */
export class ContentComposer {
  private startContent: string = ''
  private endContent: string = ''
  private components: ContentComponent[] = []

  /**
   * Sets the startContent that will prefix the composed content.
   *
   * @param text - The text to set as starting content.
   */
  setStart(text: string): void {
    this.startContent = text
  }

  /**
   * Sets the endContent that will suffix the composed content.
   *
   * @param text - The text to set as ending content.
   */
  setEnd(text: string): void {
    this.endContent = text
  }

  /**
   * Adds a ContentComponent to be included in the composition.
   *
   * @param component - The component to add.
   */
  add(component: ContentComponent): void {
    this.components.push(component)
  }

  /**
   * Assembles and returns the full content by concatenating startContent,
   * each component's description and content, and endContent.
   *
   * @returns A promise that resolves to the composed content string.
   */
  async compose(): Promise<string> {
    const componentParts = await Promise.all(
      this.components.map(async (component) => {
        const description = component.getDescription()
        const content = await component.getContent()
        if (description.trim().length > 0) {
          return `${description}\n\n${content}`
        } else {
          return `${content}`
        }
      }),
    )

    const contentParts: string[] = []

    if (this.startContent.trim()) {
      contentParts.push(this.startContent)
    }

    if (componentParts.length) {
      contentParts.push(componentParts.join('\n\n'))
    }

    if (this.endContent.trim()) {
      contentParts.push(this.endContent)
    }

    return contentParts.join('\n\n')
  }
}
