import { Page } from 'puppeteer';
import { selectByText } from '../util/puppeteerExtensions';

export interface SearchCriteria {
  prefecture: string;
  city: string;
  propertyType: string;
}

export async function searchProperties(
  page: Page,
  criteria: SearchCriteria
): Promise<void> {
  const goSearchPageBtn = await page.$abs(
    'xpath///button[text()="売買 物件検索"]'
  );
  await goSearchPageBtn.click();

  // 物件種別の選択
  const propertyTypeSelect = await page.getSelectByLabel('物件種別１');
  await selectByText(propertyTypeSelect, criteria.propertyType);

  // チェックボックスの選択
  await page.clickRadioOrCheckboxByLabel('図面ありのみ');

  // 都道府県名の入力
  const prefInput = await page.getTextInputByLabel('都道府県名');
  await prefInput.type(criteria.prefecture);

  // 所在地名１の入力
  const cityInput = await page.getTextInputByLabel('所在地名１');
  await cityInput.type(criteria.city);

  // 検索実行
  const searchButton = await page.$abs('xpath///button[text()="検索"]');
  await searchButton.click();
} 