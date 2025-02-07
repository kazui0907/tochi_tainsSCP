import './util/puppeteerExtensions';
import { Browser } from 'puppeteer';
import * as dotenv from 'dotenv';
import EnvVars from './common/EnvVars';
import { ensureDir, emptyDir, tick } from './util/misc';
import { initBrowser } from './services/browser';
import { login } from './services/auth';
import { searchProperties, SearchCriteria } from './services/search';
import { scrapeProperties } from './services/scraper';
import { exportToCsv } from './scripts/exportToCsv';
import * as path from 'path';
import * as fs from 'fs';

// 環境変数の読み込み
dotenv.config();

async function main() {
  let browser: Browser | null = null;
  try {
    // 出力ディレクトリの準備
    await ensureDir('output');
    await ensureDir('output/pdf');
    await ensureDir('output/tmp');
    await emptyDir(path.resolve('output/pdf'));
    await emptyDir(path.resolve('output/tmp'));

    // 既存のCSVとJSONファイルを削除
    const outputFiles = [
      path.join('output', 'properties.csv'),
      path.join('output', 'properties.json'),
    ];

    for (const file of outputFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`${file}を削除しました`);
      }
    }

    browser = await initBrowser();
    const page = await browser.newPage();

    const cdpSession = await page.createCDPSession();
    await cdpSession.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: 'output/pdf',
    });

    const searchCriteria: SearchCriteria = {
      prefecture: '東京都',
      city: '中野区',
      propertyType: '売土地',
    };

    console.log('レインズにログインしてます...');
    await login(page, {
      username: EnvVars.REINS_USERNAME,
      password: EnvVars.REINS_PASSWORD,
    });

    console.log('物件検索を開始します...');
    await searchProperties(page, searchCriteria);

    console.log('物件情報の取得を開始します...');
    const properties = await scrapeProperties(page);

    // 結果の出力
    console.log(`${properties.length}件の物件情報を取得しました`);
    await exportToCsv(properties, path.join('output', 'properties.csv'));

    // JSON形式でも保存
    fs.writeFileSync(
      path.join('output', 'properties.json'),
      JSON.stringify(properties, null, 2),
      'utf-8'
    );

    await tick(EnvVars.REQUEST_INTERVAL);
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    if (browser) {
      console.log('ブラウザを終了しました');
    }
    await tick();
  }
}

process.on('unhandledRejection', (error) => {
  console.error('未処理のPromise rejection:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n処理を中断します...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

export { main, SearchCriteria };
