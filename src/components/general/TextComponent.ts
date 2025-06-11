import { BaseContentComponent } from '../BaseContentComponent.js'

interface TextComponentConfig {
  description: string
  content: string
}

const defaultConfig: TextComponentConfig = {
  description: '',
  content: '',
}

export class TextComponent extends BaseContentComponent<TextComponentConfig> {
  constructor(config: Partial<TextComponentConfig> = {}) {
    const mergedConfig = { ...defaultConfig, ...config }
    super(mergedConfig.description, mergedConfig)
  }

  protected async generateContent(): Promise<string> {
    return this.config.content
  }
}
