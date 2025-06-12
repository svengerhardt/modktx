import * as fs from 'fs'
import * as path from 'path'
import logger from '../logger.js'

export class ContentFileManager {
  /**
   * Defines the root directory within which all destructive operations like folder deletion are allowed.
   * Defaults to the current working directory (process.cwd()).
   */
  private static ROOT_DIR: string = path.resolve(process.cwd())

  /**
   * Sets a custom root directory to restrict folder deletion operations.
   * Only folders within this directory can be deleted.
   * @param rootDir Absolute or relative path to the allowed root directory
   */
  static setRootDirectory(rootDir: string): void {
    this.ROOT_DIR = path.resolve(rootDir)
    logger.info(`ContentFileManager root directory set to: ${this.ROOT_DIR}`)
  }

  /**
   * Saves a file synchronously. Creates parent directories if they don't exist.
   * @param filePath Path to the file
   * @param content File content (string or Buffer)
   */
  static saveFile(filePath: string, content: string | Buffer): void {
    try {
      const dir = path.dirname(filePath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, content)
      logger.info(`File saved: ${filePath}`)
    } catch (err) {
      logger.error(`Error saving file ${filePath}:`, err)
      throw err
    }
  }

  /**
   * Reads a file synchronously.
   * @param filePath Path to the file
   * @returns File content as a string
   */
  static readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (err) {
      logger.error(`Error reading file ${filePath}:`, err)
      throw err
    }
  }

  /**
   * Deletes a file synchronously.
   * @param filePath Path to the file
   */
  static deleteFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath)
      logger.info(`File deleted: ${filePath}`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn(`File not found: ${filePath}`)
      } else {
        logger.error(`Error deleting file ${filePath}:`, err)
        throw err
      }
    }
  }

  /**
   * Creates a directory synchronously.
   * @param dirPath Path to the directory
   */
  static createFolder(dirPath: string): void {
    try {
      fs.mkdirSync(dirPath, { recursive: true })
      logger.info(`Folder created: ${dirPath}`)
    } catch (err) {
      logger.error(`Error creating folder ${dirPath}:`, err)
      throw err
    }
  }

  /**
   * Deletes a directory synchronously (recursively).
   * @param dirPath Path to the directory
   */
  static deleteFolder(dirPath: string): void {
    try {
      const resolvedPath = path.resolve(dirPath)
      // Ensure the resolved path is within the allowed root directory to prevent accidental or malicious deletions.
      if (!resolvedPath.startsWith(this.ROOT_DIR)) {
        throw new Error(
          `Refused to delete folder outside of allowed root: ${resolvedPath}`,
        )
      }
      fs.rmSync(resolvedPath, { recursive: true, force: true })
      logger.info(`Folder deleted: ${resolvedPath}`)
    } catch (err) {
      logger.error(`Error deleting folder ${dirPath}:`, err)
      throw err
    }
  }
}
