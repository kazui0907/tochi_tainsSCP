export interface Property {
  /** 物件タイトル */
  title: string;
  /** 物件番号 */
  propertyNumber: string;
  /** 物件種目（土地、戸建て等） */
  propertyType: string;
  /** 所在地 */
  location: string;
  /** 取引態様（媒介、売主等） */
  transactionType: string;
  /** 価格（円） */
  price: number;
  /** 用途地域 */
  zoneType: string;
  /** 取引状況（商談中、売止め等） */
  transactionStatus: string;
  /** 建ぺい率（%） */
  buildingCoverage: number;
  /** 土地面積（㎡） */
  size: number;
  /** ㎡単価（円/㎡） */
  pricePerSqm: number;
  /** 坪単価（円/坪） */
  pricePerTsubo: number;
  /** 最寄駅 */
  station: string;
  /** 交通アクセス */
  access: string;
  /** 容積率（%） */
  floorAreaRatio: number;
  /** 接道状況 */
  roadAccess: string;
  /** 販売会社名 */
  company: string;
  /** 道路の間口 */
  frontage: string;
  /** 販売会社の電話番号 */
  phoneNumber: string;
  /** 物件説明文 */
  description: string;
  /** PDFファイルのパス */
  pdfUrl: string;
  /** 第一種低層住居専用地域かどうか */
  hasLowRiseResidential: boolean;

  // 以下はPDFから抽出する情報

  /** 周辺施設情報 */
  nearbyFacilities: { name: string; distance: number; time: string }[];
  /** 法的条件 */
  legalRestrictions: string;
  /** 販売条件 */
  salesConditions: string;
  /** 土地の形状 */
  landShape: string;
  /** 最寄駅の特徴 */
  stationFeatures: string;
  /** 営業情報 */
  businessHours: { open: string; close: string; closedDays: string[] };
  /** 視覚的特徴 */
  visualFeatures: { images: string[]; diagramUrl: string };
  /** 都市計画関連情報 */
  urbanPlanning: { roadExpansion: string; minimumPlotSize: number; districtPlanning: string };
  /** 最適用途 */
  optimalUsage: string;
  /** 私道負担の有無 */
  privateRoadBurden: boolean;
  /** 複数の最寄駅情報 */
  nearbyStations: { station: string; distance: number; time: string }[];
  /** バス停との距離 */
  busStop: { distance: number; time: string };
  /** 契約条件 */
  contractConditions: string;
  /** 参考プラン */
  referencePlan: string;
  /** 最終更新日 */
  lastUpdated: string;
}
export interface Credentials {
  username: string;
  password: string;
}

export interface PDFAnalysisResult {
  hasLowRiseResidential: boolean;
  zoneType: string;
}

export interface CSVOptions {
  outputPath: string;
  encoding?: string;
  append?: boolean;
}
