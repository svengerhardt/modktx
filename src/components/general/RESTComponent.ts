import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type Method,
} from 'axios'
import { BaseContentComponent } from '../BaseContentComponent.js'

/**
 * Options specific to JWT authentication.
 * - token: Pre‑existing JWT to use directly.
 * - username / password: Credentials for token endpoint when token must be obtained.
 * - tokenEndpoint: Optional explicit URL for retrieving a JWT; falls back to
 *   `{origin}/api/v1/token/login` when omitted.
 */
interface JwtOptions {
  token?: string
  username?: string
  password?: string
  tokenEndpoint?: string
}

/**
 * Configuration object for RESTComponent.
 *
 * Required:
 * • url: Target endpoint.
 *
 * Optional:
 * • method: HTTP verb, defaults to 'GET'.
 * • params: Query parameters.
 * • data: Request body payload.
 * • headers: Additional HTTP headers.
 * • timeout: Request timeout in milliseconds.
 * • auth: Authentication descriptor union.
 */
export interface RESTComponentConfig extends Record<string, any> {
  description: string
  url: string
  method?: Method
  params?: Record<string, any>
  data?: any
  headers?: Record<string, string>
  timeout?: number
  /**
   * Authentication descriptor union.
   * - type: Authentication type.
   * - For 'basic', either provide a pre-encoded value, or username/password.
   * - For 'bearer', provide a token value.
   * - For 'jwt', see JwtOptions.
   */
  auth?:
    | { type: 'none' }
    | {
        type: 'apiKey'
        value: string
        name?: string
        location?: 'header' | 'query'
      }
    | { type: 'basic'; value: string; username?: never; password?: never }
    | { type: 'basic'; username: string; password: string; value?: never }
    | { type: 'bearer'; value: string }
    | ({ type: 'jwt' } & JwtOptions)
}

/** Baseline defaults merged with user‑supplied config. */
const defaultConfig: RESTComponentConfig = {
  description: '',
  url: '',
  method: 'GET',
  timeout: 10000,
}

/**
 * RESTComponent
 *
 * Extends BaseContentComponent to fetch remote resources over HTTP(S).
 * The component builds an AxiosRequestConfig based on the provided
 * RESTComponentConfig, handles authentication, issues the request,
 * and returns the response body as a string.
 */
export class RESTComponent extends BaseContentComponent<RESTComponentConfig> {
  /** Cached JWT to avoid repeated login requests during the component's lifetime. */
  private _cachedJwt?: string

  /** Time (ms) before actual expiry when we proactively refresh a JWT. */
  private static readonly JWT_REFRESH_OFFSET_MS = 60_000

  /** HTTP client instance; defaults to axios when none is injected. */
  private readonly http: AxiosInstance

  /**
   * Creates a new RESTComponent.
   * @param config Partial configuration object merged with sensible defaults.
   * @param http Custom Axios instance for HTTP requests; if not provided, the default Axios instance is used.
   */
  constructor(config: Partial<RESTComponentConfig> = {}, http?: AxiosInstance) {
    // Merge caller‑provided values with defaults before passing to base constructor
    const mergedConfig = { ...defaultConfig, ...config }
    super(mergedConfig.description, mergedConfig)
    this.http = http ?? axios
  }

  /**
   * Extracts the 'exp' claim from a JWT payload (if any).
   * @param token JSON Web Token string in three‑part form.
   * @returns Expiry time as epoch milliseconds or undefined if absent/unparseable.
   */
  private parseJwtExp(token: string): number | undefined {
    // Ensure the token has at least three dot‑separated parts
    const parts = token.split('.')
    if (parts.length < 3) return undefined

    const payloadBase64Url = parts[1]
    if (!payloadBase64Url) return undefined

    try {
      // Node's typings may not include 'base64url' yet; cast to BufferEncoding
      const json = Buffer.from(
        payloadBase64Url,
        'base64url' as unknown as BufferEncoding,
      ).toString('utf8')

      const { exp } = JSON.parse(json)
      return typeof exp === 'number' ? exp * 1000 : undefined
    } catch {
      return undefined
    }
  }

  /**
   * Determines whether a JWT is expired or within the refresh offset window.
   */
  private isJwtExpired(token: string): boolean {
    const expMs = this.parseJwtExp(token)
    if (!expMs) return false // no exp claim -> treat as non‑expiring
    return Date.now() + RESTComponent.JWT_REFRESH_OFFSET_MS >= expMs
  }

  /**
   * Executes the HTTP request and returns the response payload as a string.
   * Any network or HTTP error is propagated as an Error instance.
   */
  protected async generateContent(): Promise<string> {
    try {
      // Build request configuration (may perform async JWT acquisition)
      const axiosCfg = await this.buildRequestConfig()
      const resp = await this.http.request(axiosCfg)

      return typeof resp.data === 'string'
        ? resp.data
        : JSON.stringify(resp.data)
    } catch (err: any) {
      throw new Error(`RESTComponent-Error: ${err.message ?? err}`)
    }
  }

  /**
   * Constructs an AxiosRequestConfig based on component configuration.
   * Adds appropriate authentication headers or parameters when required.
   */
  private async buildRequestConfig(): Promise<AxiosRequestConfig> {
    const {
      url,
      method,
      params,
      data,
      headers = {},
      timeout,
      auth,
    } = this.config

    const cfg: AxiosRequestConfig = {
      url,
      method,
      params,
      data,
      headers: { ...headers },
      timeout,
    }
    // Disallow request bodies on GET to avoid servers rejecting the request
    if (method?.toUpperCase() === 'GET') {
      delete cfg.data
    }
    // Base Axios options derived from config

    // Short‑circuit when no authentication is requested
    if (!auth || auth.type === 'none') return cfg

    // Inject authentication information according to selected scheme
    switch (auth.type) {
      case 'apiKey': {
        // --- API Key Authentication ---
        const keyName =
          auth.name && auth.name.trim() !== ''
            ? auth.name
            : auth.location === 'query'
              ? 'apiKey'
              : 'x-api-key'

        if (auth.location === 'query') {
          cfg.params = { ...(cfg.params || {}), [keyName]: auth.value }
        } else {
          cfg.headers![keyName] = auth.value
        }
        break
      }

      case 'basic': {
        // --- HTTP Basic Authentication ---
        let token: string

        if ('value' in auth && auth.value) {
          token = auth.value
        } else if (
          'username' in auth &&
          'password' in auth &&
          auth.username &&
          auth.password
        ) {
          token = Buffer.from(
            `${auth.username}:${auth.password}`,
            'utf8',
          ).toString('base64')
        } else {
          throw new Error(
            'Basic auth requires either {value} or {username, password}',
          )
        }

        cfg.headers!['Authorization'] = `Basic ${token}`
        break
      }

      case 'bearer':
        // --- Bearer Token Authentication ---
        cfg.headers!['Authorization'] = `Bearer ${auth.value}`
        break

      case 'jwt': {
        // --- JWT Authentication (token may be acquired lazily) ---
        const token = await this.getJwt()
        cfg.headers!['Authorization'] = `Bearer ${token}`
        break
      }
    }

    return cfg
  }

  /**
   * Retrieves a JWT to use in the Authorization header.
   * - Returns cached token when available.
   * - Otherwise performs a login call to obtain a new token,
   *   then stores it in the cache.
   */
  private async getJwt(): Promise<string> {
    // Return early when token is already cached and not expired
    if (this._cachedJwt && !this.isJwtExpired(this._cachedJwt)) {
      return this._cachedJwt
    }

    const { auth, url } = this.config
    if (!auth || auth.type !== 'jwt')
      throw new Error('getJwt called without JWT-Auth')

    if (auth.token) {
      // Use pre‑configured static token
      this._cachedJwt = auth.token
      if (this.isJwtExpired(this._cachedJwt)) {
        throw new Error('Provided JWT is expired or about to expire')
      }
      return auth.token
    }

    // Obtain token via login endpoint
    if (!auth.username || !auth.password) {
      throw new Error(
        'JWT-Auth requires token or username/password in the config',
      )
    }

    // Build login URL based on explicit tokenEndpoint or default pattern
    const tokenUrl =
      auth.tokenEndpoint && auth.tokenEndpoint.trim() !== ''
        ? auth.tokenEndpoint
        : `${new URL(url).origin}/api/v1/token/login`

    // Perform login to retrieve JWT
    const tokenResp = await this.http.post<{ access_token: string }>(
      tokenUrl,
      null,
      {
        auth: { username: auth.username, password: auth.password },
      },
    )

    // Cache the retrieved token for subsequent calls
    this._cachedJwt = tokenResp.data.access_token
    if (this.isJwtExpired(this._cachedJwt)) {
      throw new Error('Received an already‑expired JWT')
    }
    return this._cachedJwt
  }
}
