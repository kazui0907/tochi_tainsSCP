import { ClickOptions, ElementHandle, Page } from 'puppeteer';
import { tick } from './misc';

declare module 'puppeteer' {
  interface ElementHandle {
    click(options?: ClickOptions): Promise<void>;
    select(...values: string[]): Promise<string[]>;
  }
  interface Page {
    $abs(selector: string): Promise<ElementHandle>;
    getSelectByLabel(label: string): Promise<ElementHandle>;
    clickRadioOrCheckboxByLabel(label: string): Promise<void>;
    getTextInputByLabel(labelText: string): Promise<ElementHandle>;
  }
}

// オリジナルのclickメソッドを保存
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalClick = ElementHandle.prototype.click;

// clickメソッドをオーバーライド
ElementHandle.prototype.click = async function (
  this: ElementHandle,
  options?: ClickOptions
): Promise<void> {
  await originalClick.call(this, options);
  await tick(2000);
};

// オリジナルのselectメソッドを保存
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalSelect = ElementHandle.prototype.select;

// selectメソッドをオーバーライド
ElementHandle.prototype.select = async function (
  this: ElementHandle,
  ...values: string[]
): Promise<string[]> {
  const result = await originalSelect.call(this, ...values);
  await tick(1000);
  return result;
};

Page.prototype.$abs = async function (
  this: Page,
  selector: string
): Promise<ElementHandle> {
  const el = await this.$(selector);
  if (!el) {
    console.log(`Element not found: ${selector}`);
    await tick(10000000);
    throw new Error(`Element not found: ${selector}`);
  }
  return el;
};

Page.prototype.getSelectByLabel = async function (
  this: Page,
  label: string
): Promise<ElementHandle> {
  return await this.$abs(
    `xpath///select[../../div[contains(@class,"p-label") and ./span[text()="${label}"]]]`
  );
};

Page.prototype.clickRadioOrCheckboxByLabel = async function (
  this: Page,
  label: string
): Promise<void> {
  const el = await this.$abs(
    `xpath///input[(@type = "radio" or @type = "checkbox") and ../label[text()="${label}"]]`
  );
  await el.click();
};

export async function selectByText(
  selectEl: ElementHandle,
  label: string
): Promise<void> {
  const options = await selectEl.$$('option');
  for (const option of options) {
    const text = await option.evaluate((el) => el.textContent);
    if (text === label) {
      const value = await option.evaluate((el) => el.value);
      await selectEl.select(value);
      break;
    }
  }
}

Page.prototype.getTextInputByLabel = async function (
  this: Page,
  labelText: string
): Promise<ElementHandle> {
  return await this.$abs(
    `xpath///input[@type="text" and ../../../../div[contains(@class,"p-label") and ./span[contains(text(),"${labelText}")]]]`
  );
};
