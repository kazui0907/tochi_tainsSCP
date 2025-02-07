import { Page } from 'puppeteer';
import { Credentials } from '../types';
import { tick } from '../util/misc';

export async function login(page: Page, credentials: Credentials): Promise<void> {
  try {
    await page.goto('https://system.reins.jp/login/main/KG/GKG001200');

    // ユーザー名とパスワードの入力
    const usernameInput = await page.$('#__BVID__13');
    const passwordInput = await page.$('#__BVID__16');

    if (!usernameInput || !passwordInput) {
      throw new Error('ログインフォームが見つかりません');
    }

    await usernameInput.type(credentials.username);
    await passwordInput.type(credentials.password);

    // 利用規約同意ボタンのクリック
    const agreeTosBtn = await page.$('#__BVID__20');
    if (!agreeTosBtn) {
      throw new Error('利用規約同意ボタンが見つかりません');
    }
    await agreeTosBtn.click();

    // 少し待機
    await tick(2000);

    // ログインボタンのクリックと遷移待ち
    const loginBtn = await page.$('xpath///button[text()="ログイン"]');
    if (!loginBtn) {
      throw new Error('ログインボタンが見つかりません');
    }
    await loginBtn.click();
    await page.waitForSelector('xpath///button[text()="売買 物件検索"]');
  } catch (error) {
    console.error('ログインに失敗しました:', error);
    throw error;
  }
} 