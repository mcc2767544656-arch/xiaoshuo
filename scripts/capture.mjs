import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  const page=await context.newPage();
  await page.goto('http://localhost:4173');await page.waitForSelector('.book-card');
  await page.screenshot({path:resolve('screenshots/preview.png')});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:resolve('screenshots/mobile-preview.png')});
} finally { await browser.close(); }
