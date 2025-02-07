import puppeteer, { Browser } from 'puppeteer';
import EnvVars from '../common/EnvVars';
import * as fs from 'fs';
import * as path from 'path';

export async function initBrowser(): Promise<Browser> {
  // PDFダウンロードフォルダの作成
  const pdfDir = path.resolve('./output/pdf');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  return await puppeteer.launch({
    headless: false,
    userDataDir: EnvVars.PROFILE_DIR,
    defaultViewport: null,
    args: ['--start-maximized'],
  });
}
