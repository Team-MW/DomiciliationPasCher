const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: "new"
  });
  
  const sizes = [
    { width: 1280, height: 800, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 812, name: 'mobile' }
  ];

  for (const size of sizes) {
      const page = await browser.newPage();
      await page.setViewport({ width: size.width, height: size.height });
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
      await page.screenshot({ path: `screenshot-${size.name}.png`, fullPage: true });
      await page.close();
      console.log(`Screenshot saved for ${size.name}`);
  }

  await browser.close();
})();
