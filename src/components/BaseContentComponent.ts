import type { ContentComponent } from './ContentComponent.js'
import logger from '../logger.js'

export abstract class BaseContentComponent<T extends Record<string, any>>
  implements ContentComponent
{
  protected descriptionPrompt: string
  protected config: T

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

  public abstract getContent(): Promise<string>
}
