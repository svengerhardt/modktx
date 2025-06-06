# Creating Custom Components

Custom components allow you to supply dynamic or external data to a
`ContentComposer`. Any class that implements the `ContentComponent`
interface can be used as a component. The easiest way is to extend
`BaseContentComponent` which handles description prompts and basic
configuration.

## Implementation Steps

1. **Define a configuration interface** describing the parameters your
   component requires.
2. **Create default values** so unspecified options fall back to sensible
   settings.
3. **Extend `BaseContentComponent`** and call `super()` with a description
   template and the merged configuration.
4. **Implement `getContent()`** to return the string that should be added
   to the final composition. This method may fetch data, perform
   calculations, or build text.

## Minimal Example

```ts
import { BaseContentComponent } from 'modktx'

interface MyComponentConfig {
  description: string
  endpoint: string
}

const defaults: MyComponentConfig = {
  description: 'Data from {{endpoint}}',
  endpoint: ''
}

export class MyComponent extends BaseContentComponent<MyComponentConfig> {
  constructor(config: Partial<MyComponentConfig> = {}) {
    const merged = { ...defaults, ...config }
    super(merged.description, merged)
  }

  async getContent(): Promise<string> {
    const res = await fetch(this.config.endpoint)
    return await res.text()
  }
}
```

After defining the class, import it and add an instance to a
`ContentComposer` just like the built-in components.

