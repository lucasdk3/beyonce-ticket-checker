const express = require('express');
const puppeteer = require('puppeteer');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteerExtra = require('puppeteer-extra');

const app = express();
const port = 9090;

// Configura o Puppeteer com Stealth
puppeteerExtra.use(StealthPlugin());

// Middleware para CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Rota principal
app.get('/find', async (req, res) => {
    try {
        console.log('Iniciando o scraper...');
        const result = await runScraper();
        console.log('Scraper concluído.');
        res.json(result);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// Função do scraper
async function runScraper() {
    let browser;
    browser = await puppeteer.launch({
        defaultViewport: {
            width: 1366,
            height: 768
        },
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
        waitUntil: 'domcontentloaded'
    });

    // Tratamento de cookies
    console.log('Cookie handling success');
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 10000 });
    await page.click('#onetrust-accept-btn-handler');
    await page.waitForSelector('#onetrust-banner-sdk', { hidden: true, timeout: 10000 });

    // Processamento do mapa
    let result = { sectors: [] };

    try {
        console.log('Map processing success');
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

        return result;

    } catch (e) {
        console.error('Error processing map:', e);
        return { error: 'Map processing failed' };
    } finally {
        await browser.close();
    }

}

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});