import type { PostProcessor } from './PostProcessor.js'

/**
 * Type representing a projection schema.
 * Each key = either true (include the entire value) or another nested Projection object.
 * In this variation, the projection is interpreted so that keys like "close" and "rsi"
 * are found anywhere in the tree, not just at a fixed hierarchy.
 */
export type Projection = {
  [key: string]: true | Projection
}

/**
 * JsonProjectionFilter filters any JSON:
 * - preserves the overall structure ("5m", "candles", "indicators" remain intact),
 * - filters each object to only include the keys specified in `projection`,
 * - traverses **all** arrays in the tree instead of only the first one found.
 */
export class JsonProjectionFilter implements PostProcessor {
  private readonly projection: Projection
  private readonly limit?: number

  constructor(projection: Projection, limit?: number) {
    this.projection = projection
    this.limit = limit
  }

  /**
   * Recursively filters any node (object | array) in the tree.
   * - Returns `null` if the node itself contains no matching keys and none of its children contain anything matching the `projection`.
   * - Otherwise:
   *   • If the node is an array, apply filterNode to each element, remove all "empty" results (null or empty objects),
   *     and return the array if it is not completely empty.
   *   • If the node is an object, then:
   *     1. For each key that is directly in `this.projection` and `true`, copy `node[key]` 1:1.
   *     2. For each key whose value is an object or array, call `filterNode` recursively.
   *     3. Only return if at least one property remains (object has own properties or array is not empty).
   */
  private filterNode(node: any): any | null {
    // 1) If array → filter each element, remove "empty" results
    if (Array.isArray(node)) {
      const filtered: any[] = []
      for (const elem of node) {
        const felem = this.filterNode(elem)
        // If felem !== null AND (if object: not empty), keep it:
        if (
          felem !== null &&
          !(
            typeof felem === 'object' &&
            !Array.isArray(felem) &&
            Object.keys(felem).length === 0
          )
        ) {
          filtered.push(felem)
        }
      }
      return filtered.length > 0 ? filtered : null
    }

    // 2) If object → either direct capture from projection OR filter deeper
    if (node && typeof node === 'object') {
      const result: any = {}

      // a) First: all keys in this object that are in the projection and true → copy 1:1
      for (const key of Object.keys(this.projection)) {
        if (this.projection[key] === true && node.hasOwnProperty(key)) {
          result[key] = node[key]
        }
      }

      // b) Then: for all key/value pairs whose value is an object or array, filter recursively
      for (const key of Object.keys(node)) {
        const child = node[key]
        if (child !== null && typeof child === 'object') {
          const filteredChild = this.filterNode(child)
          if (
            filteredChild !== null &&
            !(
              typeof filteredChild === 'object' &&
              !Array.isArray(filteredChild) &&
              Object.keys(filteredChild).length === 0
            )
          ) {
            result[key] = filteredChild
          }
        }
      }

      // c) Did we keep anything in this object at all?
      return Object.keys(result).length > 0 ? result : null
    }

    // 3) Alle anderen Fälle (Primitive, Funktionen etc.) → nicht direkt behalten
    return null
  }

  /**
   * Final processing:
   * - parse the content,
   * - apply filterNode to the root,
   * - optionally apply limit to each array separately,
   * - done.
   */
  async postProcess(content: string): Promise<string> {
    try {
      const parsed = JSON.parse(content)
      const filteredRoot = this.filterNode(parsed)

      if (filteredRoot === null) {
        return `No matching fields found in json data`
      }

      // If a limit is defined, we apply it **to all arrays** in the result,
      // by again recursively walking through the filtered result
      // and keeping only the last N elements of each array.
      if (this.limit !== undefined) {
        const limit = this.limit
        const applyLimit = (node: any): any => {
          if (Array.isArray(node)) {
            // If array is longer than limit, keep only the last limit entries
            const sliced =
              node.length > limit ? node.slice(-limit) : node.slice()
            return sliced.map((elem) => applyLimit(elem))
          }
          if (node && typeof node === 'object') {
            const o: any = {}
            for (const k of Object.keys(node)) {
              o[k] = applyLimit(node[k])
            }
            return o
          }
          return node
        }
        const limited = applyLimit(filteredRoot)
        return JSON.stringify(limited)
      }

      return JSON.stringify(filteredRoot)
    } catch (err) {
      return `Error parsing json data`
    }
  }
}
