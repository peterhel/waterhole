import puppeteer from 'puppeteer';
import fs from 'fs';
import { exec } from 'node:child_process'
import prettier from 'prettier';

let url = process.argv[2]

let interceptedRequestCount = -1
async function logRequest(interceptedRequest) {
    interceptedRequestCount++

    if (interceptedRequestCount === 0) {
        switch(interceptedRequest.status()) {
            case 200:
                let text = await interceptedRequest.text()
                text = prettier.format(text, {parser: 'html'});

                fs.writeFileSync('index-1.html', text, 'utf-8')
                break;
            case 301:
            case 302:
                console.log(`The site is redirected. Try running the command with the following url: ${interceptedRequest.headers()['location']}`)
                process.exit(1)
            default:
                console.log(`The site did not return success code: ${interceptedRequest.status()}`)
                process.exit(1)
        }
    }
}

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('response', logRequest);
    await page.goto(url)
    page.off('response', logRequest);

    let text = await page.$eval('html', el => el.outerHTML);
    text = prettier.format(text, {parser: 'html'});

    fs.writeFileSync('index-2.html', text, 'utf-8')

    await browser.close();

    const [err, res] = await new Promise(resolve => exec('diff -u index-1.html index-2.html | npx diff2html-cli -i stdin', (x, y) => resolve([x,y])));
    
    if(err) {
       console.error(err) 
    }
})();