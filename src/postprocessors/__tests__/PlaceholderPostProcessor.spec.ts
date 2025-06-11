import { PlaceholderPostProcessor } from '../PlaceholderPostProcessor.js'

describe('PlaceholderPostProcessor', () => {
  it('replaces placeholders with provided values', async () => {
    const p = new PlaceholderPostProcessor({ name: 'Alice', age: 30 })
    const result = await p.postProcess(
      'User {{ name }} is {{ age }} years old.',
    )
    expect(result).toBe('User Alice is 30 years old.')
  })

  it('keeps unknown placeholders intact', async () => {
    const p = new PlaceholderPostProcessor({ foo: 'bar' })
    const result = await p.postProcess('Hello {{ unknown }}')
    expect(result).toBe('Hello {{unknown}}')
  })
})
