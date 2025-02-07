import * as path from 'path';
import { ensureDir } from '../util/misc';
import { fromPath } from 'pdf2pic';
import OpenAI from 'openai';
import * as fs from 'fs';
import EnvVars from '@src/common/EnvVars';

const openai = new OpenAI({
  apiKey: EnvVars.OpenAIAPIKey,
});

interface PDFAnalysisResult {
  hasLowRiseResidential: boolean;
  nearbyFacilities: {
    name: string;
    distance: number;
    time: string;
  }[];
  legalRestrictions: string;
  salesConditions: string;
  landShape: string;
  stationFeatures: string;
  businessHours: {
    open: string;
    close: string;
    closedDays: string[];
  };
  visualFeatures: {
    images: string[];
    diagramUrl: string;
  };
  urbanPlanning: {
    roadExpansion: string;
    minimumPlotSize: number;
    districtPlanning: string;
  };
  optimalUsage: string;
  privateRoadBurden: boolean;
  nearbyStations: {
    station: string;
    distance: number;
    time: string;
  }[];
  busStop: {
    distance: number;
    time: string;
  };
  contractConditions: string;
  referencePlan: string;
  lastUpdated: string;
}

async function analyzePDF(pdfPath: string): Promise<PDFAnalysisResult> {
  try {
    const tmpDir = path.resolve('output/tmp');
    await ensureDir(tmpDir);

    // PDFを画像に変換
    const options = {
      density: 300,
      saveFilename: path.basename(pdfPath, '.pdf'),
      savePath: tmpDir,
      format: 'png' as const,
      width: 2000,
      height: 2000,
    };

    const convert = fromPath(pdfPath, options);
    await convert(1, { responseType: 'image' });
    console.log('PDFを画像に変換しました');

    const imagePath = path.join(tmpDir, `${options.saveFilename}.1.png`);
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

    // OpenAI APIを使用して画像を解析

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: '不動産物件の図面から以下の情報を抽出してください。日本語で回答してください。',
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'property_schema',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              hasLowRiseResidential: {
                type: 'boolean',
                description: '第一種低層住居専用地域かどうか',
              },
              nearbyFacilities: {
                type: 'array',
                description: '周辺施設情報',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: '施設の名前',
                    },
                    distance: {
                      type: 'number',
                      description: '施設までの距離',
                    },
                    time: {
                      type: 'string',
                      description: '施設までの所要時間',
                    },
                  },
                  required: ['name', 'distance', 'time'],
                  additionalProperties: false,
                },
              },
              legalRestrictions: {
                type: 'string',
                description: '法的条件',
              },
              salesConditions: {
                type: 'string',
                description: '販売条件',
              },
              landShape: {
                type: 'string',
                description: '土地の形状',
              },
              stationFeatures: {
                type: 'string',
                description: '最寄駅の特徴',
              },
              businessHours: {
                type: 'object',
                description: '営業情報',
                properties: {
                  open: {
                    type: 'string',
                    description: '開店時間',
                  },
                  close: {
                    type: 'string',
                    description: '閉店時間',
                  },
                  closedDays: {
                    type: 'array',
                    description: '定休日',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['open', 'close', 'closedDays'],
                additionalProperties: false,
              },
              visualFeatures: {
                type: 'object',
                description: '視覚的特徴',
                properties: {
                  images: {
                    type: 'array',
                    description: '画像のリスト',
                    items: {
                      type: 'string',
                    },
                  },
                  diagramUrl: {
                    type: 'string',
                    description: '図面のURL',
                  },
                },
                required: ['images', 'diagramUrl'],
                additionalProperties: false,
              },
              urbanPlanning: {
                type: 'object',
                description: '都市計画関連情報',
                properties: {
                  roadExpansion: {
                    type: 'string',
                    description: '道路拡幅の情報',
                  },
                  minimumPlotSize: {
                    type: 'number',
                    description: '最小敷地面積',
                  },
                  districtPlanning: {
                    type: 'string',
                    description: '区画計画の情報',
                  },
                },
                required: [
                  'roadExpansion',
                  'minimumPlotSize',
                  'districtPlanning',
                ],
                additionalProperties: false,
              },
              optimalUsage: {
                type: 'string',
                description: '最適用途',
              },
              privateRoadBurden: {
                type: 'boolean',
                description: '私道負担の有無',
              },
              nearbyStations: {
                type: 'array',
                description: '複数の最寄駅情報',
                items: {
                  type: 'object',
                  properties: {
                    station: {
                      type: 'string',
                      description: '駅名',
                    },
                    distance: {
                      type: 'number',
                      description: '駅までの距離',
                    },
                    time: {
                      type: 'string',
                      description: '駅までの所要時間',
                    },
                  },
                  required: ['station', 'distance', 'time'],
                  additionalProperties: false,
                },
              },
              busStop: {
                type: 'object',
                description: 'バス停との距離',
                properties: {
                  distance: {
                    type: 'number',
                    description: 'バス停までの距離',
                  },
                  time: {
                    type: 'string',
                    description: 'バス停までの所要時間',
                  },
                },
                required: ['distance', 'time'],
                additionalProperties: false,
              },
              contractConditions: {
                type: 'string',
                description: '契約条件',
              },
              referencePlan: {
                type: 'string',
                description: '参考プラン',
              },
              lastUpdated: {
                type: 'string',
                description: '最終更新日',
              },
            },
            required: [
              'hasLowRiseResidential',
              'nearbyFacilities',
              'legalRestrictions',
              'salesConditions',
              'landShape',
              'stationFeatures',
              'businessHours',
              'visualFeatures',
              'urbanPlanning',
              'optimalUsage',
              'privateRoadBurden',
              'nearbyStations',
              'busStop',
              'contractConditions',
              'referencePlan',
              'lastUpdated',
            ],
            additionalProperties: false,
          },
        },
      },
      temperature: 1,
      max_tokens: 10000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    if (!response.choices[0].message.content) {
      throw new Error('APIからの応答が空です');
    }

    const result = JSON.parse(
      response.choices[0].message.content
    ) as PDFAnalysisResult;
    return result;
  } catch (error) {
    console.error('PDF解析エラー:', error);
    throw error;
  }
}

export { analyzePDF, PDFAnalysisResult };
