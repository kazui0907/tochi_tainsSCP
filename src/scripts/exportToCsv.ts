import { createObjectCsvWriter } from 'csv-writer';
import { Property } from '../types';
import * as path from 'path';
import * as fs from 'fs';

async function exportToCsv(properties: Property[], outputCsvPath: string): Promise<void> {
  try {
    // 出力ディレクトリの作成
    const outputDir = path.dirname(outputCsvPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // CSVライターの設定
    const csvWriter = createObjectCsvWriter({
      path: outputCsvPath,
      header: [
        { id: 'propertyNumber', title: '物件番号' },
        { id: 'propertyType', title: '物件種目' },
        { id: 'location', title: '所在地' },
        { id: 'price', title: '価格' },
        { id: 'size', title: '土地面積(㎡)' },
        { id: 'pricePerSqm', title: '㎡単価' },
        { id: 'pricePerTsubo', title: '坪単価' },
        { id: 'transactionType', title: '取引態様' },
        { id: 'transactionStatus', title: '取引状況' },
        { id: 'buildingCoverage', title: '建ぺい率(%)' },
        { id: 'floorAreaRatio', title: '容積率(%)' },
        { id: 'zoneType', title: '用途地域' },
        { id: 'hasLowRiseResidential', title: '第一種低層住居' },
        { id: 'station', title: '最寄駅' },
        { id: 'access', title: '交通' },
        { id: 'roadAccess', title: '接道状況' },
        { id: 'frontage', title: '接道' },
        { id: 'company', title: '販売会社' },
        { id: 'phoneNumber', title: '電話番号' },
        { id: 'landShape', title: '土地形状' },
        { id: 'legalRestrictions', title: '法的制限' },
        { id: 'salesConditions', title: '販売条件' },
        { id: 'contractConditions', title: '契約条件' },
        { id: 'optimalUsage', title: '最適用途' },
        { id: 'privateRoadBurden', title: '私道負担' },
        { id: 'lastUpdated', title: '最終更新日' },
        { id: 'nearbyFacilities', title: '周辺施設' },
        { id: 'nearbyStations', title: '最寄駅情報' },
        { id: 'busStop', title: 'バス停情報' },
      ],
      encoding: 'utf8',
    });

    // データの整形
    const records = properties.map(property => ({
      ...property,
      // 数値のフォーマット
      price: property.price.toLocaleString(),
      pricePerSqm: property.pricePerSqm.toLocaleString(),
      pricePerTsubo: property.pricePerTsubo.toLocaleString(),
      buildingCoverage: `${property.buildingCoverage}%`,
      floorAreaRatio: `${property.floorAreaRatio}%`,
      // ブール値を日本語に変換
      hasLowRiseResidential: property.hasLowRiseResidential ? '○' : '☓',
      privateRoadBurden: property.privateRoadBurden ? 'あり' : 'なし',
      // 配列データの整形
      nearbyFacilities: property.nearbyFacilities
        ?.map(f => `${f.name}(${f.distance}m, ${f.time})`)
        .join('、') ?? '',
      nearbyStations: property.nearbyStations
        ?.map(s => `${s.station}(${s.distance}m, ${s.time})`)
        .join('、') ?? '',
      // オブジェクトデータの整形
      busStop: property.busStop
        ? `${property.busStop.distance}m, ${property.busStop.time}`
        : '',
    }));

    // CSV出力
    await csvWriter.writeRecords(records);
    console.log(`CSVファイルを出力しました: ${outputCsvPath}`);
  } catch (error) {
    console.error('CSV出力エラー:', error);
    throw error;
  }
}

export { exportToCsv }; 