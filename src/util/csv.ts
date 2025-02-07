import { createObjectCsvWriter } from 'csv-writer';
import { Property } from '@src/types';
import * as path from 'path';
import { ensureDir } from './misc';

async function exportToCSV(
  properties: Property[],
  outputPath: string
): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'title', title: '物件名' },
      { id: 'price', title: '価格' },
      { id: 'location', title: '所在地' },
      { id: 'size', title: '面積' },
      { id: 'description', title: '説明' },
      { id: 'pdfUrl', title: '図面URL' },
      { id: 'hasLowRiseResidential', title: '第一種低層住居' },
      { id: 'zoneType', title: '用途地域' },
    ],
    encoding: 'utf8',
    append: false,
  });

  try {
    // 出力ディレクトリの作成
    const dir = path.dirname(outputPath);
    await ensureDir(dir);

    // CSV出力
    await csvWriter.writeRecords(
      properties.map((property) => ({
        ...property,
        // boolean値を日本語に変換
        hasLowRiseResidential: property.hasLowRiseResidential ? 'あり' : 'なし',
        // 金額をカンマ区切りに
        price: property.price.toLocaleString(),
      }))
    );

    console.log(`CSVファイルを出力しました: ${outputPath}`);
  } catch (error) {
    console.error('CSV出力エラー:', error);
    throw error;
  }
}

export { exportToCSV };
