import type { ContentComponent } from './ContentComponent.js'
import logger from '../logger.js'
import type { PostProcessor } from '../postprocessors/PostProcessor.js'

export abstract class BaseContentComponent<T extends Record<string, any>>
  implements ContentComponent
{
  protected descriptionPrompt: string
  protected config: T
  private postProcessors: PostProcessor[] = []

  protected constructor(descriptionPrompt: string, config: T) {
    logger.debug(`${this.constructor.name}: ${JSON.stringify(config)}`)
    this.descriptionPrompt = descriptionPrompt
    this.config = config
  }

  private interpolate(
    template: string,
    variables: Record<string, any>,
  ): string {
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const trimmedKey = key.trim()
      return variables[trimmedKey] ?? ''
    })
  }

  public getDescription(): string {
    return this.interpolate(this.descriptionPrompt, this.config)
  }

  protected abstract generateContent(): Promise<string>

  /**
   * Adds post-processors that run after the component generates its content.
   * Processors are executed in the order they are provided.
   */
  public postProcess(...processors: PostProcessor[]): this {
    this.postProcessors.push(...processors)
    return this
  }

  /**
   * Generates the content and applies any configured post-processors.
   */
  public async getContent(): Promise<string> {
    let content = await this.generateContent()
    for (const processor of this.postProcessors) {
      content = await processor.postProcess(content)
    }
    return content
  }
}
