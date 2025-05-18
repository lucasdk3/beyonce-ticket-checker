// api/find.js

const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

module.exports = async (req, res) => {
    // Configura CORS para permitir acesso do frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        const browser = await puppeteer.launch({
            executablePath: await chrome.executablePath,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
            ],
        });

        const page = await browser.newPage();

        // Configurações de Stealth
        await page.setUserAgent(
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0'
        );

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Navegação principal
        await page.goto('https://www.ticketmaster.co.uk/beyonce-cowboy-carter-tour-london-12-06-2025/event/3500623FECA69A81', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Tratamento de cookies
        try {
            await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 5000 });
            await page.click('#onetrust-accept-btn-handler');
            await page.waitForSelector('#onetrust-banner-sdk', { hidden: true, timeout: 5000 });
        } catch (e) {
            console.log('Cookie handling skipped');
        }

        // Processamento do mapa
        let result = { sectors: [] };

        try {
            await page.waitForSelector('svg', { timeout: 10000 });
            await page.evaluate(() => window.scrollBy(0, 800));

            const frame = await page.$('iframe#main');
            const iframeContent = frame ? await frame.contentFrame() : page;

            if (frame) await iframeContent.waitForSelector('svg', { timeout: 10000 });

            result = await iframeContent.evaluate(() => {
                const clubs = Array.from(document.querySelectorAll('path[data-section-name]'))
                    .filter(section => {
                        const name = section.getAttribute('data-section-name') || '';
                        return name.toUpperCase().includes('CLUB HO-DOWN');
                    })
                    .map(section => ({
                        name: section.getAttribute('data-section-name'),
                        available: section.getAttribute('data-active') === 'true'
                    }));

                return { sectors: clubs };
            });

        } catch (e) {
            console.error('Error processing map:', e);
            return res.status(500).json({ error: 'Map processing failed' });
        } finally {
            await browser.close();
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Global error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};