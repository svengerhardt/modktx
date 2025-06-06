import type { ContentComponent } from '../components/ContentComponent.js'
import type { PostProcessor } from '../postprocessors/PostProcessor.js'

export class ContentPostProcessor implements ContentComponent {
  constructor(
    private component: ContentComponent,
    private postProcessor: PostProcessor,
  ) {}

  public getDescription(): string {
    return this.component.getDescription()
  }

  public async getContent(): Promise<string> {
    const content = await this.component.getContent()
    return this.postProcessor.postProcess(content)
  }
}
