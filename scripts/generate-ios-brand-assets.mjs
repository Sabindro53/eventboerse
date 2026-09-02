import { chromium } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'resources', 'ios', 'logo-source.html');

const targets = [
  {
    size: 1024,
    ink: 0.5,
    master: path.join(root, 'resources', 'ios', 'logo-master-1024.png'),
    copies: [
      path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')
    ]
  },
  {
    size: 2732,
    ink: 0.24,
    master: path.join(root, 'resources', 'ios', 'splash-master-2732.png'),
    copies: [
      path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', 'splash-2732x2732.png'),
      path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', 'splash-2732x2732-1.png'),
      path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', 'splash-2732x2732-2.png')
    ]
  }
];

const browser = await chromium.launch({ headless: true });

try {
  for (const target of targets) {
    await mkdir(path.dirname(target.master), { recursive: true });
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1
    });
    const url = new URL(pathToFileURL(source));
    url.searchParams.set('size', String(target.size));
    url.searchParams.set('ink', String(target.ink));
    await page.goto(url.href);
    await page.waitForFunction(() => window.__logoReady);
    await page.locator('canvas').screenshot({ path: target.master });
    for (const copy of target.copies) {
      await mkdir(path.dirname(copy), { recursive: true });
      await copyFile(target.master, copy);
    }
    const details = await page.evaluate(() => window.__logoReady);
    console.log(`${path.relative(root, target.master)}: ${JSON.stringify(details)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
