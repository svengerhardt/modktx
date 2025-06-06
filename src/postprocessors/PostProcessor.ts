export interface PostProcessor {
  postProcess(content: string): Promise<string>
}
