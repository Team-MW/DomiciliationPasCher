const puppeteer = require('puppeteer-core');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
    try {
        const browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'new'
        });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
        
        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
        
        console.log('Page loaded. Checking root element...');
        const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML);
        console.log('ROOT CONTENT LENGTH:', rootContent?.length ?? 0);
        
        await browser.close();
    } catch (e) {
        console.error('SCRIPT ERROR:', e.message);
    }
})();
