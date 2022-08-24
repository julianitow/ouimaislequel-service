import express from 'express';
import fs from 'fs';
import https from 'https';
import jsdom from 'jsdom';

const app = express();
const { JSDOM } = jsdom;
const PORT = 3000;
const filename = 'macdo-restaurants-paris.json';

interface Address {
    adress: String,
    zipCode: String,
    city: String,
    country: String,
}

interface Restaurant {
    name: String,
    coordinates: Number[],
    address: Address,
    visited: boolean,
    note: number,
}

const options: any = {
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

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

// TODO array of restaurants in file
async function fetchRestaurants(): Promise<void> {
    const path = '/liste-restaurants-mcdonalds-france';
    const urls = [];
    const restaurants = [];
    const chunks = [];
    options.path = path;
    if (fs.existsSync(filename)) {
        fs.copyFileSync(filename, `${filename}.copy`);
    }
    console.log('Erasing file');
    fs.writeFileSync(filename, '');
    console.log('Fetching all restaurants...');
    const req = https.request(options, (res) => {
        res.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        res.on('end', () => {
            console.log(`Status code: ${res.statusCode}`);
            if (res.statusCode !== 200) { throw new Error(`Error while connecting to mcdonald's website`); }
            fs.rmSync(`${filename}.copy`);
            console.log('Fetching restaurant data...');
            const body = Buffer.concat(chunks).toString();
            const dom = new JSDOM(body);
            const doc = dom.window.document as HTMLHtmlElement;
            const tds = doc.getElementsByTagName('td');
            for (const td of tds) {
                const tdHtml = td.innerHTML;
                const url = tdHtml.split('"')[1];
                if (url.indexOf('paris') !== -1) {
                    urls.push(url);
                }
            }
            // tslint:disable-next-line: forin
            for (const index in urls) {
                sleep(100).then(() => {
                    const restoChunks = [];
                    const splitUrl = urls[index].split('/');
                    const restaurantId = splitUrl[splitUrl.length - 1];
                    console.log(`${index} => Fetching data restaurant id: ${restaurantId}`);
                    if (Number(index) === 0) {
                        fs.writeFileSync(filename, '[');
                    }
                    const restReq = https.request(
                            `https://ws.mcdonalds.fr/api/restaurant/${restaurantId}
                            ?responseGroups=RG.RESTAURANT.ADDRESSES
                            &responseGroups=RG.RESTAURANT.FACILITIES
                            &responseGroups=RG.RESTAURANT.NEWS
                            &responseGroups=RG.RESTAURANT.PICTURES
                            &responseGroups=RG.RESTAURANT.METADATAS`,
                        (response) => {
                            response.on('data', (chunk: Buffer) => {
                            restoChunks.push(chunk);
                        });

                            response.on('end', () => {
                                if (response.statusCode !== 200) { throw new Error(`Error while connecting to mcdonald's website`); }
                                const restaurant = JSON.parse(Buffer.concat(restoChunks).toString());
                                restaurants.push(restaurant);
                                console.log(`${index} => Writing data to file: ${filename}`);
                                // console.log(restaurant);
                                fs.appendFileSync(filename, `${JSON.stringify(restaurant, null, 4)}`);
                                console.log(`${index} => Request ended, restaurant ${restaurantId}: ${res.statusCode}`);
                                if (Number(index) === urls.length - 1 ) {
                                    fs.appendFileSync(filename, ']');
                                } else {
                                    fs.appendFileSync(filename, ',');
                                }
                        });

                            response.on('error', (err) => {
                            throw err;
                        });
                    });
                    restReq.end();
                });
            }
        });

        res.on('error', (err) => {
            throw(err);
        });
    });

    req.end();
}

app.get('/list', (req, res) => {
    const fileContent = JSON.parse(fs.readFileSync(filename).toString());
    const restaurants: Restaurant[] = [];
    // tslint:disable-next-line: forin
    for (const index in fileContent) {
        const restaurantFile = fileContent[index];
        const addr: Address = {
            adress: restaurantFile.restaurantAddress[0].address1,
            zipCode: restaurantFile.restaurantAddress[0].zipCode,
            city: restaurantFile.restaurantAddress[0].city,
            country: restaurantFile.restaurantAddress[0].country
        }
        const restaurant: Restaurant = {
            name: restaurantFile.name,
            coordinates: [restaurantFile.coordinates.latitude, restaurantFile.coordinates.longitude],
            address: addr,
            visited: false,
            note: 0
        }
        restaurants.push(restaurant);
    }
    res.send(restaurants);
});

// fetchRestaurants();

async function main(): Promise<number> {
    if (process.argv.length > 2) {
        const params = process.argv.filter((arg, index) => index > 1);
        if (params.includes('update')) {
            console.log('=======UPDATE RESTAURANTS LIST=======');
            await fetchRestaurants();
        }

        if (params.includes('start')) {
            app.listen(PORT, () => {
                console.log(`Mcdo comm api listening on port ${PORT}`);
            });
        }
    }
    return 0;
}

main();
