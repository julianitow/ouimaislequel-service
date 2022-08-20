import express from 'express';
import https from 'https';
import jsdom from 'jsdom';
import zlib from 'zlib';

const app = express();
const { JSDOM } = jsdom;
const PORT = 3000;

const options = {
    method: 'GET',
    hostname: 'www.mcdonalds.fr',
    path: '/liste-restaurants-mcdonalds-france',
    headers: {
      'Upgrade-Insecure-Requests': '1',
      // tslint:disable-next-line: object-literal-sort-keys
      'Sec-GPC': '1',
      'Sec-Fetch-User': '?1',
      'If-None-Match': '"e911b-vlh/iD6E8+d1RCxEWKoo0y0lK/8"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0',
      'Referer': 'https://duckduckgo.com',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'deflate, br',
      'TE': 'trailers',
      'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    },
    maxRedirects: 20,
  };

function fetchRestaurants(): void {
    let urls = [];
    const chunks = [];
    const req = https.request(options, (res) => {
        res.on('data', (chunk: Buffer) => {
            console.log(res.statusCode);
            chunks.push(chunk);
        });

        res.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            const dom = new JSDOM(body);
            const doc = dom.window.document as HTMLHtmlElement;
            const tds = doc.getElementsByTagName('td');
            for (const td of tds) {
                const tdHtml = td.innerHTML;
                const url = tdHtml.split('"')[1];
                if(url.indexOf('paris') !== -1) {
                    urls.push(url);
                }
            }
            console.log(urls);
        });

        res.on('error', (err) => {
            console.error(err);
        });
    });

    req.end();
}

app.get('/list/:city', (req, res) => {
    res.send(req.params.city);
});

app.listen(PORT, () => {
    fetchRestaurants();
    console.log(`service listening on port ${PORT}`);
});
