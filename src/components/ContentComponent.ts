export interface ContentComponent {
  getDescription(): string
  getContent(): Promise<string>
}
