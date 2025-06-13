import { jest } from '@jest/globals'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { RESTComponentConfig } from '../general/RESTComponent.js'

jest.unstable_mockModule('axios', () => ({
  default: {},
}))

/**
 * Helper that builds a RESTComponent with a mocked AxiosInstance,
 * triggers `getContent`, and returns the captured AxiosRequestConfig.
 */
async function exec(partialCfg: Partial<RESTComponentConfig>): Promise<{
  cfg: AxiosRequestConfig
  request: jest.MockedFunction<
    (cfg: AxiosRequestConfig) => Promise<{ data: string }>
  >
}> {
  const raw = { data: 'OK' }

  const request = jest
    .fn<(cfg: AxiosRequestConfig) => Promise<{ data: string }>>()
    .mockResolvedValue(raw)

  const mockAxios = { request } as unknown as AxiosInstance
  const comp = new RESTComponent({ ...partialCfg }, mockAxios)

  await comp.getContent()
  return { cfg: request.mock.calls[0]![0], request }
}

let RESTComponent: typeof import('../general/RESTComponent.js').RESTComponent

beforeAll(async () => {
  // Dynamically import the component after mocks are in place
  const mod = await import('../general/RESTComponent.js')
  RESTComponent = mod.RESTComponent
})

describe('RESTComponent', () => {
  it('GET request drops body and sets API-Key header', async () => {
    const { cfg, request } = await exec({
      url: 'https://api',
      method: 'GET',
      data: { shouldBeRemoved: true },
      auth: { type: 'apiKey', value: 'secret', name: 'X-My-ApiKey' },
    })

    expect(request).toHaveBeenCalledTimes(1)
    expect(cfg.method).toBe('GET')
    expect(cfg).not.toHaveProperty('data')
    expect((cfg.headers as any)['X-My-ApiKey']).toBe('secret')
  })

  it('Basic auth with pre‑encoded value sets Authorization header', async () => {
    const { cfg } = await exec({
      url: 'https://secure',
      method: 'GET',
      auth: { type: 'basic', value: 'dXNlcjpwYXNz' }, // 'user:pass'
    })

    expect((cfg.headers as any)['Authorization']).toBe('Basic dXNlcjpwYXNz')
  })

  it('Basic auth with username/password encodes to Base64', async () => {
    const { cfg } = await exec({
      url: 'https://secure2',
      method: 'GET',
      auth: { type: 'basic', username: 'user', password: 'pass' },
    })

    expect((cfg.headers as any)['Authorization']).toBe('Basic dXNlcjpwYXNz')
  })

  it('Bearer auth sets Authorization header', async () => {
    const { cfg } = await exec({
      url: 'https://bearer',
      method: 'GET',
      auth: { type: 'bearer', value: 'token123' },
    })

    expect((cfg.headers as any)['Authorization']).toBe('Bearer token123')
  })
})
