import type { PostProcessor } from './PostProcessor.js'

/**
 * Schema describing which fields to keep when filtering an arbitrary JSON document.
 *
 * * **Key -> `true`** – keep the entire value found under that key, no matter how deeply it is nested.
 * * **Key -> nested {@link Projection}** – descend into that sub‑structure and apply the nested rules there.
 *
 * The projection behaves as a global allow‑list: every key marked `true` is accepted wherever it appears.
 * A nested projection narrows the selection for its matching subtree while the outer projection
 * continues to apply to the rest of the document.
 */
export type Projection = {
  [key: string]: true | Projection
}

/**
 * `JsonProjectionFilter` post‑processes a JSON string by **whitelisting** fields defined in a {@link Projection}
 * and - optionally - trimming arrays to their last *N* elements.
 *
 * **Key features**
 * 1. Preserves the original hierarchy.
 * 2. Applies the projection *recursively* — nested projections are fully supported.
 * 3. Traverses **all** arrays in the tree, not just the first one encountered.
 * 4. Accepts custom `parse` / `stringify` functions (defaults: `JSON.parse`, `JSON.stringify`).
 * 5. Optional `limit`: after filtering, every array is sliced to its last *limit* elements.
 */
export class JsonProjectionFilter implements PostProcessor {
  private readonly projection: Projection
  private readonly limit?: number
  private readonly parse: (input: string) => any
  private readonly stringify: (input: any) => string

  /**
   * @param projection   Projection schema that drives the filter.
   * @param limit        Optional cap applied to the *length* of every array in the filtered result.
   * @param parse        Custom JSON parser. Defaults to {@link JSON.parse}.
   * @param stringify    Custom JSON stringify function. Defaults to {@link JSON.stringify}.
   */
  constructor(
    projection: Projection,
    limit?: number,
    parse: (input: string) => any = JSON.parse,
    stringify: (input: any) => string = JSON.stringify,
  ) {
    this.projection = projection
    this.limit = limit
    this.parse = parse
    this.stringify = stringify
  }

  /**
   * Recursively filters a node using the given projection (supports nested projections).
   * - Returns `null` if the node itself contains no matching keys and none of its children contain anything matching the `projection`.
   * - Otherwise:
   *   - If the node is an array, apply filterNode to each element, remove all "empty" results (null or empty objects),
   *     and return the array if it is not completely empty.
   *   - If the node is an object, then:
   *     1. For each key that is directly in `projection` and `true`, copy `node[key]` 1:1.
   *     2. For each key whose value is an object or array, call `filterNode` recursively.
   *     3. Only return if at least one property remains (object has own properties or array is not empty).
   * @param node Current subtree node (object, array, or primitive).
   * @param projection Projection object that applies at the current tree level.
   * @returns filtered node or null if no matching keys found
   */
  private filterNode(
    node: any,
    projection: Projection = this.projection,
  ): any | null {
    // 1) If array -> filter each element, remove "empty" results
    if (Array.isArray(node)) {
      const filtered: any[] = []
      for (const elem of node) {
        const felem = this.filterNode(elem, projection)
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

    // 2) If object -> either direct capture from projection OR filter deeper
    if (node && typeof node === 'object') {
      const result: any = {}

      // a) First: all keys in this object that are in the projection and true -> copy 1:1
      for (const key of Object.keys(projection)) {
        if (projection[key] === true && node.hasOwnProperty(key)) {
          result[key] = node[key]
        }
      }

      // b) Then: for all key/value pairs whose value is an object or array, filter recursively
      for (const key of Object.keys(node)) {
        const child = node[key]
        if (child !== null && typeof child === 'object') {
          const nextProjection =
            projection.hasOwnProperty(key) && projection[key] !== true
              ? (projection[key] as Projection)
              : projection
          const filteredChild = this.filterNode(child, nextProjection)
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

    // 3) All other cases (primitives, functions etc.) -> do not keep directly
    return null
  }

  /**
   * Executes the full post‑processing pipeline:
   * 1. Parse the input JSON string.
   * 2. Recursively filter the resulting value according to {@link projection}.
   * 3. If {@link limit} is set, truncate every array to its last *limit* items.
   *
   * @param content Raw JSON string to be processed.
   * @returns The filtered JSON encoded as a string, or an explanatory message when no keys matched.
   */
  async postProcess(content: string): Promise<string> {
    const parsed = this.parse(content)
    const filteredRoot = this.filterNode(parsed, this.projection)

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
          const sliced = node.length > limit ? node.slice(-limit) : node.slice()
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
      return this.stringify(limited)
    }

    return this.stringify(filteredRoot)
  }
}
