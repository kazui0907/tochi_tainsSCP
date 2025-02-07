# 不動産物件情報スクレイピングツール

## 概要
不動産物件のWebサイト(https://www.reins.co.jp/)から情報を収集し、構造化データとして取得するスクレイピングツールです。

## 主要機能
1. レインズの物件情報スクレイピング
2. 図面PDFのOCR解析による「第一種低層住居」物件の抽出
3. 抽出データのCSV出力

## 要件定義

### 機能要件
1. コンフィグファイル:env/**.env
   - common/EnvVars.tsにて環境変数を定義
2. スクレイピング基本機能
   - profileDir: ログイン情報を含むプロファイルディレクトリ
   - レインズシステムへのログインと認証
   - 検索条件の設定：
     - 対象区分：売土地
     - 所在地：東京都世田谷区
   - 物件ごとに以下の情報を取得：
     - タイトル
     - 価格
     - 所在地
     - 面積
     - 説明文
     - 図面PDF

3. PDF解析機能
   - 図面PDFのダウンロード
   - OCRによるテキスト抽出
   - 「第一種低層住居」キーワード検索
   - 該当物件の特定とリスト化

4. データ出力機能
   - 抽出データのCSV形式での出力
   - 以下の情報を含む：
     - 基本物件情報
     - 図面の有無
     - 用途地域情報

5. エラーハンドリング
   - スクレイピング失敗時の適切なエラー処理
   - ネットワークエラーの処理
   - OCR解析エラーの処理
   - セッションタイムアウトの処理

### 技術要件

1. 使用ライブラリ
   - Puppeteer: ブラウザ操作とスクレイピング
   - Tesseract.js: OCRテキスト認識
   - pdf.js: PDF解析
   - csv-writer: CSV出力

2. 型定義
   ```typescript
   interface Property {
     title: string;
     price: number;
     location: string;
     size: string;
     description: string;
     pdfUrl: string;
     hasLowRiseResidential: boolean;
     zoneType: string;
   }
   ```

### 拡張予定の機能
1. データ収集の拡張
   - 複数ページのクローリング
   - ページネーション対応
   - 詳細ページの情報取得
   - 検索条件の動的設定

2. 出力オプション
   - JSON形式での保存
   - CSVエクスポート
   - データベースへの保存
   - PDFレポート生成


## 注意事項
- レインズの利用規約を遵守してください
- アクセス制限を考慮し、適切な間隔でリクエストを送信してください
- 取得したデータの使用には、著作権や個人情報保護に関する法律を遵守してください
- OCR解析の精度は図面の品質に依存します

## ディレクトリ構成
```
.
├── env/                    # 環境変数ファイル
│   ├── development.env    # 開発環境用
│   ├── production.env     # 本番環境用
│   └── test.env          # テスト環境用
│
├── src/                   # ソースコード
│   ├── common/           # 共通モジュール
│   │   └── EnvVars.ts   # 環境変数定義
│   │
│   ├── scraper/         # スクレイピング関連
│   │   ├── propertyScaper.ts    # 物件情報取得
│   │   └── pdfScaper.ts         # PDF解析
│   │
│   ├── types/           # 型定義
│   │   └── index.ts     # 共通の型定義
│   │
│   ├── util/            # ユーティリティ
│   │   ├── auth.ts      # 認証関連
│   │   ├── csv.ts       # CSV出力
│   │   └── puppeteerExtensions.ts  # Puppeteer拡張
│   │
│   └── index.ts         # エントリーポイント
│
├── output/              # 出力ファイル
│   ├── csv/            # CSV出力
│   └── pdf/            # ダウンロードしたPDF
│
├── tests/              # テストファイル
│   ├── unit/          # ユニットテスト
│   └── integration/   # 統合テスト
│
├── tsconfig.json       # TypeScript設定
├── tsconfig.prod.json  # 本番用TypeScript設定
└── package.json        # プロジェクト設定
```
