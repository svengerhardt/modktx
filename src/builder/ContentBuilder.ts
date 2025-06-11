import type { ContentComponent } from '../components/ContentComponent.js'
import type { PostProcessor } from '../postprocessors/PostProcessor.js'

/**
 * ContentBuilder assembles content from ContentComponent instances.
 * It supports optional start and end text as well as global post-processing.
 */
export class ContentBuilder {
  private startContent = ''
  private endContent = ''
  private components: ContentComponent[] = []
  private postProcessors: PostProcessor[] = []

  /**
   * Sets the text that prefixes the composed content.
   */
  setStart(text: string): this {
    this.startContent = text
    return this
  }

  /**
   * Sets the text that suffixes the composed content.
   */
  setEnd(text: string): this {
    this.endContent = text
    return this
  }

  /**
   * Adds a component to the composition chain.
   */
  add(component: ContentComponent): this {
    this.components.push(component)
    return this
  }

  /**
   * Attaches post-processors that run on the final composed content.
   * Processors are applied in the order they are added.
   */
  postProcess(...processors: PostProcessor[]): this {
    this.postProcessors.push(...processors)
    return this
  }

  /**
   * Composes all components, applies post-processors, and returns the result.
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

    const parts: string[] = []

    if (this.startContent.trim()) {
      parts.push(this.startContent)
    }

    if (componentParts.length) {
      parts.push(componentParts.join('\n\n'))
    }

    if (this.endContent.trim()) {
      parts.push(this.endContent)
    }

    let result = parts.join('\n\n')

    for (const processor of this.postProcessors) {
      result = await processor.postProcess(result)
    }

    return result
  }
}
