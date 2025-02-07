import axios from 'axios';

/**
 * Miscellaneous shared functions go here.
 */

/**
 * Get a random number between 1 and 1,000,000,000,000
 */
export function getRandomInt(): number {
  return Math.floor(Math.random() * 1_000_000_000_000);
}

/**
 * Wait for a certain number of milliseconds.
 */
export function tick(milliseconds?: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds ?? 2147483647);
  });
}

import * as fs from 'fs';
import * as path from 'path';

/**
 * 指定されたミリ秒待機する
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ディレクトリが存在しない場合は作成する
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.access(dirPath);
  } catch {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * ファイルをダウンロードして保存する
 */
export async function downloadFile(
  url: string,
  outputDir: string
): Promise<string> {
  const fileName = path.basename(url);
  const filePath = path.join(outputDir, fileName);

  await ensureDir(outputDir);

  const response = await axios.get<Buffer>(url, {
    responseType: 'arraybuffer',
  });
  await fs.promises.writeFile(filePath, response.data);

  return filePath;
}

export async function emptyDir(dirPath: string): Promise<void> {
  await ensureDir(dirPath);
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    fs.unlinkSync(path.join(dirPath, file));
  }
}
