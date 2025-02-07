import { Page } from 'puppeteer';
import { Property } from '../types';
import { tick } from '../util/misc';
import * as fs from 'fs';
import * as path from 'path';
import { analyzePDF } from '../scraper/pdfScaper';
import { exportToCsv } from '@src/scripts/exportToCsv';

async function waitForDownload(): Promise<string> {
  const outputDir = path.resolve('output/pdf');
  const beforeFiles = new Set(fs.readdirSync(outputDir));
  const maxWaitTime = 10000; // 10秒
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkNewFile = () => {
      const currentFiles = fs.readdirSync(outputDir);
      const newFile = currentFiles.find(
        (file) => !beforeFiles.has(file) && !file.endsWith('.crdownload')
      );

      if (newFile) {
        resolve(newFile);
      } else if (Date.now() - startTime > maxWaitTime) {
        reject(new Error('ダウンロードがタイムアウトしました'));
      } else {
        setTimeout(checkNewFile, 100);
      }
    };

    checkNewFile();
  });
}

export async function scrapeProperties(page: Page): Promise<Property[]> {
  let allProperties: Property[] = [];
  let currentPage = 1;

  // 次のページがある限りエンドレスで処理を繰り返すループ
  while (true) {
    console.log(`--- ページ ${currentPage} の処理開始 ---`);

    // 物件情報の取得
    const properties = await page.evaluate(() => {
      const properties: Property[] = [];
      const rows = document.querySelectorAll('.p-table-body-row');

      // ヘッダーの位置とテキストのマッピングを作成
      const headerPositions = new Map<string, string>();
      document.querySelectorAll('.p-table-header-item').forEach((header) => {
        const text = header.textContent?.trim() ?? '';
        const style = header.getAttribute('style') ?? '';
        if (text) {
          headerPositions.set(style, text);
        }
      });

      // スタイル属性からヘッダーテキストへの逆引きマップを作成
      const styleToHeader = new Map<string, string>();
      headerPositions.forEach((headerText, style) => {
        styleToHeader.set(style, headerText);
      });

      rows.forEach((row) => {
        const items = row.querySelectorAll('.p-table-body-item');
        const valueMap = new Map<string, string>();

        items.forEach((item) => {
          const style = item.getAttribute('style') ?? '';
          const text = item.textContent?.trim() ?? '';
          const headerText = styleToHeader.get(style);
          if (headerText) {
            valueMap.set(headerText, text);
          }
        });

        const property: Property = {
          title: valueMap.get('物件番号') ?? '',
          propertyNumber: valueMap.get('物件番号') ?? '',
          propertyType: valueMap.get('物件種目') ?? '',
          location: valueMap.get('所在地') ?? '',
          transactionType: valueMap.get('取引態様') ?? '',
          price: parseInt((valueMap.get('価格') ?? '0').replace(/[^0-9]/g, '')),
          zoneType: valueMap.get('用途地域') ?? '',
          transactionStatus: valueMap.get('取引状況') ?? '',
          buildingCoverage: parseInt(
            (valueMap.get('建ぺい率') ?? '0').replace(/[^0-9]/g, '')
          ),
          size: parseFloat(
            (valueMap.get('土地面積') ?? '0').replace(/[^0-9.]/g, '')
          ),
          pricePerSqm: parseFloat(
            (valueMap.get('㎡単価') ?? '0').replace(/[^0-9.]/g, '')
          ),
          pricePerTsubo: parseFloat(
            (valueMap.get('坪単価') ?? '0').replace(/[^0-9.]/g, '')
          ),
          station: valueMap.get('沿線駅') ?? '',
          access: valueMap.get('交通') ?? '',
          floorAreaRatio: parseInt(
            (valueMap.get('容積率') ?? '0').replace(/[^0-9]/g, '')
          ),
          roadAccess: valueMap.get('接道状況') ?? '',
          company: valueMap.get('商号') ?? '',
          frontage: valueMap.get('接道１') ?? '',
          phoneNumber: valueMap.get('電話番号') ?? '',
          description: '',

          pdfUrl: '',
          hasLowRiseResidential: false,
          nearbyFacilities: [],
          legalRestrictions: '',
          salesConditions: '',
          landShape: '',
          stationFeatures: '',
          businessHours: {
            open: '',
            close: '',
            closedDays: [],
          },
          visualFeatures: {
            images: [],
            diagramUrl: '',
          },
          urbanPlanning: {
            roadExpansion: '',
            minimumPlotSize: 0,
            districtPlanning: '',
          },
          optimalUsage: '',
          privateRoadBurden: false,
          nearbyStations: [],
          busStop: {
            distance: 0,
            time: '',
          },
          contractConditions: '',
          referencePlan: '',
          lastUpdated: '',
        };

        properties.push(property);
      });

      return properties;
    });

    // 図面のダウンロード処理
    console.log('図面のダウンロードを開始します...');
    for (let i = 0; i < properties.length; i++) {
      // PDFのAIによる解析の回数制限※ここはテスト時に使用するので、絶対に消さない。
      if (i > 4) {
        console.log('使用上限に達したため、処理を中断します');
        break;
      }
      const property = properties[i];
      console.log(`物件 ${i + 1}/${properties.length} の図面をダウンロード中...`);

      try {
        // 図面ボタンをクリック
        const buttons = await page.$$('xpath///button[text()="図面"]');
        const button = buttons[i];

        // ボタンを画面内に表示
        await button.evaluate((el) => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await tick(1000);

        await button.focus();
        await tick(1000);

        const [filename] = await Promise.all([waitForDownload(), button.click()]);

        await tick(1000); // 安全のため、少し待機

        // 【修正箇所】
        // ダウンロードしたPDFの名称を、CSVのA列（物件番号）に合わせた「物件番号.pdf」に変更する処理を追加
        const oldFilePath = path.resolve('output/pdf', filename);
        const newFilename = property.propertyNumber + '.pdf';
        const newFilePath = path.resolve('output/pdf', newFilename);
        fs.renameSync(oldFilePath, newFilePath);

        // ダウンロードしたPDFのファイル名を設定（物件番号.pdf）
        property.pdfUrl = newFilename;

        // PDFの解析
        console.log(`物件 ${i + 1}/${properties.length} の図面を解析中...`);
        const pdfPath = path.resolve('output/pdf', newFilename);
        const analysisResult = await analyzePDF(pdfPath);

        // 解析結果を物件情報に反映
        property.hasLowRiseResidential = analysisResult.hasLowRiseResidential;
        property.nearbyFacilities = analysisResult.nearbyFacilities;
        property.legalRestrictions = analysisResult.legalRestrictions;
        property.salesConditions = analysisResult.salesConditions;
        property.landShape = analysisResult.landShape;
        property.stationFeatures = analysisResult.stationFeatures;
        property.businessHours = analysisResult.businessHours;
        property.visualFeatures = analysisResult.visualFeatures;
        property.urbanPlanning = analysisResult.urbanPlanning;
        property.optimalUsage = analysisResult.optimalUsage;
        property.privateRoadBurden = analysisResult.privateRoadBurden;
        property.nearbyStations = analysisResult.nearbyStations;
        property.busStop = analysisResult.busStop;
        property.contractConditions = analysisResult.contractConditions;
        property.referencePlan = analysisResult.referencePlan;
        property.lastUpdated = analysisResult.lastUpdated;

        console.log(`物件 ${i + 1}/${properties.length} の解析が完了しました`);

        fs.writeFileSync(
          'output/properties.json',
          JSON.stringify(properties, null, 2)
        );
        await exportToCsv(properties, 'output/properties.csv');
      } catch (error) {
        console.error(`物件 ${property.propertyNumber} の図面処理に失敗:`, error);
        property.pdfUrl = ''; // エラーの場合は空文字列を設定
      }
    }

    // 現在のページの物件情報を全体に追加
    allProperties.push(...properties);

    // 【修正箇所】
    // 次のページへのリンクの取得と移動処理を、待機処理をwaitForFunctionに置き換え
    const nextPageButton = await page.$('button.page-link[aria-label="Go to next page"]');
    if (!nextPageButton) {
      console.log('次のページへのリンクが見つかりません。全ページの処理を終了します。');
      break;
    }

    // 現在のテーブルの最初の行のテキストを記録
    const firstRowSelector = '.p-table-body-row:first-child';
    const previousFirstRowText = await page.$eval(firstRowSelector, (el: Element) => (el as HTMLElement).innerText);

    console.log('次のページに移動します...');
    await nextPageButton.click();

    // 新しいページの最初の行が更新されるまで待つ
    await page.waitForFunction(
      (selector, oldText) => {
        const el = document.querySelector(selector);
        return el && (el as HTMLElement).innerText !== oldText;
      },
      {},
      firstRowSelector,
      previousFirstRowText
    );    

    currentPage++;
  }

  return allProperties;
}


// バージョン２
// import { Page } from 'puppeteer';
// import { Property } from '../types';
// import { tick } from '../util/misc';
// import * as fs from 'fs';
// import * as path from 'path';
// import { analyzePDF } from '../scraper/pdfScaper';
// import { exportToCsv } from '@src/scripts/exportToCsv';

// async function waitForDownload(): Promise<string> {
//   const outputDir = path.resolve('output/pdf');
//   const beforeFiles = new Set(fs.readdirSync(outputDir));
//   const maxWaitTime = 10000; // 10秒
//   const startTime = Date.now();

//   return new Promise((resolve, reject) => {
//     const checkNewFile = () => {
//       const currentFiles = fs.readdirSync(outputDir);
//       const newFile = currentFiles.find(
//         (file) => !beforeFiles.has(file) && !file.endsWith('.crdownload')
//       );

//       if (newFile) {
//         resolve(newFile);
//       } else if (Date.now() - startTime > maxWaitTime) {
//         reject(new Error('ダウンロードがタイムアウトしました'));
//       } else {
//         setTimeout(checkNewFile, 100);
//       }
//     };

//     checkNewFile();
//   });
// }

// export async function scrapeProperties(page: Page): Promise<Property[]> {
//   let allProperties: Property[] = [];
//   let currentPage = 1;

//   // 次のページがある限りエンドレスで処理を繰り返すループ
//   while (true) {
//     console.log(`--- ページ ${currentPage} の処理開始 ---`);

//     // 物件情報の取得
//     const properties = await page.evaluate(() => {
//       const properties: Property[] = [];
//       const rows = document.querySelectorAll('.p-table-body-row');

//       // ヘッダーの位置とテキストのマッピングを作成
//       const headerPositions = new Map<string, string>();
//       document.querySelectorAll('.p-table-header-item').forEach((header) => {
//         const text = header.textContent?.trim() ?? '';
//         const style = header.getAttribute('style') ?? '';
//         if (text) {
//           headerPositions.set(style, text);
//         }
//       });

//       // スタイル属性からヘッダーテキストへの逆引きマップを作成
//       const styleToHeader = new Map<string, string>();
//       headerPositions.forEach((headerText, style) => {
//         styleToHeader.set(style, headerText);
//       });

//       rows.forEach((row) => {
//         const items = row.querySelectorAll('.p-table-body-item');
//         const valueMap = new Map<string, string>();

//         items.forEach((item) => {
//           const style = item.getAttribute('style') ?? '';
//           const text = item.textContent?.trim() ?? '';
//           const headerText = styleToHeader.get(style);
//           if (headerText) {
//             valueMap.set(headerText, text);
//           }
//         });

//         const property: Property = {
//           title: valueMap.get('物件番号') ?? '',
//           propertyNumber: valueMap.get('物件番号') ?? '',
//           propertyType: valueMap.get('物件種目') ?? '',
//           location: valueMap.get('所在地') ?? '',
//           transactionType: valueMap.get('取引態様') ?? '',
//           price: parseInt((valueMap.get('価格') ?? '0').replace(/[^0-9]/g, '')),
//           zoneType: valueMap.get('用途地域') ?? '',
//           transactionStatus: valueMap.get('取引状況') ?? '',
//           buildingCoverage: parseInt(
//             (valueMap.get('建ぺい率') ?? '0').replace(/[^0-9]/g, '')
//           ),
//           size: parseFloat(
//             (valueMap.get('土地面積') ?? '0').replace(/[^0-9.]/g, '')
//           ),
//           pricePerSqm: parseFloat(
//             (valueMap.get('㎡単価') ?? '0').replace(/[^0-9.]/g, '')
//           ),
//           pricePerTsubo: parseFloat(
//             (valueMap.get('坪単価') ?? '0').replace(/[^0-9.]/g, '')
//           ),
//           station: valueMap.get('沿線駅') ?? '',
//           access: valueMap.get('交通') ?? '',
//           floorAreaRatio: parseInt(
//             (valueMap.get('容積率') ?? '0').replace(/[^0-9]/g, '')
//           ),
//           roadAccess: valueMap.get('接道状況') ?? '',
//           company: valueMap.get('商号') ?? '',
//           frontage: valueMap.get('接道１') ?? '',
//           phoneNumber: valueMap.get('電話番号') ?? '',
//           description: '',

//           pdfUrl: '',
//           hasLowRiseResidential: false,
//           nearbyFacilities: [],
//           legalRestrictions: '',
//           salesConditions: '',
//           landShape: '',
//           stationFeatures: '',
//           businessHours: {
//             open: '',
//             close: '',
//             closedDays: [],
//           },
//           visualFeatures: {
//             images: [],
//             diagramUrl: '',
//           },
//           urbanPlanning: {
//             roadExpansion: '',
//             minimumPlotSize: 0,
//             districtPlanning: '',
//           },
//           optimalUsage: '',
//           privateRoadBurden: false,
//           nearbyStations: [],
//           busStop: {
//             distance: 0,
//             time: '',
//           },
//           contractConditions: '',
//           referencePlan: '',
//           lastUpdated: '',
//         };

//         properties.push(property);
//       });

//       return properties;
//     });

//     // 図面のダウンロード処理
//     console.log('図面のダウンロードを開始します...');
//     for (let i = 0; i < properties.length; i++) {
//     // PDFのAIによる解析の回数制限※ここはテスト時に使用するので、絶対に消さない。
//       if (i > 4) {
//         console.log('使用上限に達したため、処理を中断します');
//         break;
//       }
//       const property = properties[i];
//       console.log(`物件 ${i + 1}/${properties.length} の図面をダウンロード中...`);

//       try {
//         // 図面ボタンをクリック
//         const buttons = await page.$$('xpath///button[text()="図面"]');
//         const button = buttons[i];

//         // ボタンを画面内に表示
//         await button.evaluate((el) => {
//           el.scrollIntoView({ behavior: 'smooth', block: 'center' });
//         });
//         await tick(1000);

//         await button.focus();
//         await tick(1000);

//         const [filename] = await Promise.all([waitForDownload(), button.click()]);

//         await tick(1000); // 安全のため、少し待機

//         // ダウンロードしたPDFのファイル名を設定
//         property.pdfUrl = filename;

//         // PDFの解析
//         console.log(`物件 ${i + 1}/${properties.length} の図面を解析中...`);
//         const pdfPath = path.resolve('output/pdf', filename);
//         const analysisResult = await analyzePDF(pdfPath);

//         // 解析結果を物件情報に反映
//         property.hasLowRiseResidential = analysisResult.hasLowRiseResidential;
//         property.nearbyFacilities = analysisResult.nearbyFacilities;
//         property.legalRestrictions = analysisResult.legalRestrictions;
//         property.salesConditions = analysisResult.salesConditions;
//         property.landShape = analysisResult.landShape;
//         property.stationFeatures = analysisResult.stationFeatures;
//         property.businessHours = analysisResult.businessHours;
//         property.visualFeatures = analysisResult.visualFeatures;
//         property.urbanPlanning = analysisResult.urbanPlanning;
//         property.optimalUsage = analysisResult.optimalUsage;
//         property.privateRoadBurden = analysisResult.privateRoadBurden;
//         property.nearbyStations = analysisResult.nearbyStations;
//         property.busStop = analysisResult.busStop;
//         property.contractConditions = analysisResult.contractConditions;
//         property.referencePlan = analysisResult.referencePlan;
//         property.lastUpdated = analysisResult.lastUpdated;

//         console.log(`物件 ${i + 1}/${properties.length} の解析が完了しました`);

//         fs.writeFileSync(
//           'output/properties.json',
//           JSON.stringify(properties, null, 2)
//         );
//         await exportToCsv(properties, 'output/properties.csv');
//       } catch (error) {
//         console.error(`物件 ${property.propertyNumber} の図面処理に失敗:`, error);
//         property.pdfUrl = ''; // エラーの場合は空文字列を設定
//       }
//     }

//     // 現在のページの物件情報を全体に追加
//     allProperties.push(...properties);

//     // 【修正箇所】
//     // 次のページへのリンクの取得と移動処理を、待機処理をwaitForFunctionに置き換え
//     const nextPageButton = await page.$('button.page-link[aria-label="Go to next page"]');
//     if (!nextPageButton) {
//       console.log('次のページへのリンクが見つかりません。全ページの処理を終了します。');
//       break;
//     }

//     // 現在のテーブルの最初の行のテキストを記録
//     const firstRowSelector = '.p-table-body-row:first-child';
//     const previousFirstRowText = await page.$eval(firstRowSelector, (el: Element) => (el as HTMLElement).innerText);

//     console.log('次のページに移動します...');
//     await nextPageButton.click();

//     // 新しいページの最初の行が更新されるまで待つ
//     await page.waitForFunction(
//       (selector, oldText) => {
//         const el = document.querySelector(selector);
//         return el && (el as HTMLElement).innerText !== oldText;
//       },
//       {},
//       firstRowSelector,
//       previousFirstRowText
//     );    

//     currentPage++;
//   }

//   return allProperties;
// }


// バージョン１
// import { Page } from 'puppeteer';
// import { Property } from '../types';
// import { tick } from '../util/misc';
// import * as fs from 'fs';
// import * as path from 'path';
// import { analyzePDF } from '../scraper/pdfScaper';
// import { exportToCsv } from '@src/scripts/exportToCsv';

// async function waitForDownload(): Promise<string> {
//   const outputDir = path.resolve('output/pdf');
//   const beforeFiles = new Set(fs.readdirSync(outputDir));
//   const maxWaitTime = 10000; // 10秒
//   const startTime = Date.now();

//   return new Promise((resolve, reject) => {
//     const checkNewFile = () => {
//       const currentFiles = fs.readdirSync(outputDir);
//       const newFile = currentFiles.find(
//         (file) => !beforeFiles.has(file) && !file.endsWith('.crdownload')
//       );

//       if (newFile) {
//         resolve(newFile);
//       } else if (Date.now() - startTime > maxWaitTime) {
//         reject(new Error('ダウンロードがタイムアウトしました'));
//       } else {
//         setTimeout(checkNewFile, 100);
//       }
//     };

//     checkNewFile();
//   });
// }

// export async function scrapeProperties(page: Page): Promise<Property[]> {
//   // 物件情報の取得
//   const properties = await page.evaluate(() => {
//     const properties: Property[] = [];
//     const rows = document.querySelectorAll('.p-table-body-row');

//     // ヘッダーの位置とテキストのマッピングを作成
//     const headerPositions = new Map<string, string>();
//     document.querySelectorAll('.p-table-header-item').forEach((header) => {
//       const text = header.textContent?.trim() ?? '';
//       const style = header.getAttribute('style') ?? '';
//       if (text) {
//         headerPositions.set(style, text);
//       }
//     });

//     // スタイル属性からヘッダーテキストへの逆引きマップを作成
//     const styleToHeader = new Map<string, string>();
//     headerPositions.forEach((headerText, style) => {
//       styleToHeader.set(style, headerText);
//     });

//     rows.forEach((row) => {
//       const items = row.querySelectorAll('.p-table-body-item');
//       const valueMap = new Map<string, string>();

//       items.forEach((item) => {
//         const style = item.getAttribute('style') ?? '';
//         const text = item.textContent?.trim() ?? '';
//         const headerText = styleToHeader.get(style);
//         if (headerText) {
//           valueMap.set(headerText, text);
//         }
//       });

//       const property: Property = {
//         title: valueMap.get('物件番号') ?? '',
//         propertyNumber: valueMap.get('物件番号') ?? '',
//         propertyType: valueMap.get('物件種目') ?? '',
//         location: valueMap.get('所在地') ?? '',
//         transactionType: valueMap.get('取引態様') ?? '',
//         price: parseInt((valueMap.get('価格') ?? '0').replace(/[^0-9]/g, '')),
//         zoneType: valueMap.get('用途地域') ?? '',
//         transactionStatus: valueMap.get('取引状況') ?? '',
//         buildingCoverage: parseInt(
//           (valueMap.get('建ぺい率') ?? '0').replace(/[^0-9]/g, '')
//         ),
//         size: parseFloat(
//           (valueMap.get('土地面積') ?? '0').replace(/[^0-9.]/g, '')
//         ),
//         pricePerSqm: parseFloat(
//           (valueMap.get('㎡単価') ?? '0').replace(/[^0-9.]/g, '')
//         ),
//         pricePerTsubo: parseFloat(
//           (valueMap.get('坪単価') ?? '0').replace(/[^0-9.]/g, '')
//         ),
//         station: valueMap.get('沿線駅') ?? '',
//         access: valueMap.get('交通') ?? '',
//         floorAreaRatio: parseInt(
//           (valueMap.get('容積率') ?? '0').replace(/[^0-9]/g, '')
//         ),
//         roadAccess: valueMap.get('接道状況') ?? '',
//         company: valueMap.get('商号') ?? '',
//         frontage: valueMap.get('接道１') ?? '',
//         phoneNumber: valueMap.get('電話番号') ?? '',
//         description: '',

//         pdfUrl: '',
//         hasLowRiseResidential: false,
//         nearbyFacilities: [],
//         legalRestrictions: '',
//         salesConditions: '',
//         landShape: '',
//         stationFeatures: '',
//         businessHours: {
//           open: '',
//           close: '',
//           closedDays: [],
//         },
//         visualFeatures: {
//           images: [],
//           diagramUrl: '',
//         },
//         urbanPlanning: {
//           roadExpansion: '',
//           minimumPlotSize: 0,
//           districtPlanning: '',
//         },
//         optimalUsage: '',
//         privateRoadBurden: false,
//         nearbyStations: [],
//         busStop: {
//           distance: 0,
//           time: '',
//         },
//         contractConditions: '',
//         referencePlan: '',
//         lastUpdated: '',
//       };

//       properties.push(property);
//     });

//     return properties;
//   });

//   // 図面のダウンロード処理
//   console.log('図面のダウンロードを開始します...');
//   for (let i = 0; i < properties.length; i++) {
//     // PDFのAIによる解析の回数制限
//     // if (i > 10) {
//     //   console.log('使用上限に達したため、処理を中断します');
//     //   break;
//     // }
//     const property = properties[i];
//     console.log(`物件 ${i + 1}/${properties.length} の図面をダウンロード中...`);

//     try {
//       // 図面ボタンをクリック
//       const buttons = await page.$$('xpath///button[text()="図面"]');
//       const button = buttons[i];

//       // ボタンを画面内に表示
//       await button.evaluate((el) => {
//         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
//       });
//       await tick(1000);

//       await button.focus();
//       await tick(1000);

//       const [filename] = await Promise.all([waitForDownload(), button.click()]);

//       await tick(1000); // 安全のため、少し待機

//       // ダウンロードしたPDFのファイル名を設定
//       property.pdfUrl = filename;

//       // PDFの解析
//       console.log(`物件 ${i + 1}/${properties.length} の図面を解析中...`);
//       const pdfPath = path.resolve('output/pdf', filename);
//       const analysisResult = await analyzePDF(pdfPath);

//       // 解析結果を物件情報に反映
//       property.hasLowRiseResidential = analysisResult.hasLowRiseResidential;
//       property.nearbyFacilities = analysisResult.nearbyFacilities;
//       property.legalRestrictions = analysisResult.legalRestrictions;
//       property.salesConditions = analysisResult.salesConditions;
//       property.landShape = analysisResult.landShape;
//       property.stationFeatures = analysisResult.stationFeatures;
//       property.businessHours = analysisResult.businessHours;
//       property.visualFeatures = analysisResult.visualFeatures;
//       property.urbanPlanning = analysisResult.urbanPlanning;
//       property.optimalUsage = analysisResult.optimalUsage;
//       property.privateRoadBurden = analysisResult.privateRoadBurden;
//       property.nearbyStations = analysisResult.nearbyStations;
//       property.busStop = analysisResult.busStop;
//       property.contractConditions = analysisResult.contractConditions;
//       property.referencePlan = analysisResult.referencePlan;
//       property.lastUpdated = analysisResult.lastUpdated;

//       console.log(`物件 ${i + 1}/${properties.length} の解析が完了しました`);

//       fs.writeFileSync(
//         'output/properties.json',
//         JSON.stringify(properties, null, 2)
//       );
//       await exportToCsv(properties, 'output/properties.csv');
//     } catch (error) {
//       console.error(`物件 ${property.propertyNumber} の図面処理に失敗:`, error);
//       property.pdfUrl = ''; // エラーの場合は空文字列を設定
//     }
//   }

//   return properties;
// }
