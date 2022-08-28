import fs from 'fs';
import https from 'https';
import jsdom from 'jsdom';
import IAddress from '../Interfaces/IAddress';
import IRestaurant from '../Interfaces/IRestaurant';

const { JSDOM } = jsdom;

function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}

class DataParser {
    public static filename = 'macdo-restaurants-paris.json';

    public static fetchRestaurants(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const path = '/liste-restaurants-mcdonalds-france';
            const urls = [];
            const restaurants = [];
            const chunks = [];
            DataParser.options.path = path;
            if (fs.existsSync(DataParser.filename)) {
                fs.copyFileSync(DataParser.filename, `${DataParser.filename}.copy`);
            }
            console.log('Erasing file');
            fs.writeFileSync(DataParser.filename, '');
            console.log('Fetching all restaurants...');
            const req = https.request(DataParser.options, (res) => {
                res.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    console.log(`Status code: ${res.statusCode}`);
                    if (res.statusCode !== 200) { throw new Error(`Error while connecting to mcdonald's website`); }
                    fs.rmSync(`${DataParser.filename}.copy`);
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
                                fs.writeFileSync(DataParser.filename, '[');
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
                                        console.log(`${index} => Writing data to file: ${DataParser.filename}`);
                                        // console.log(restaurant);
                                        fs.appendFileSync(
                                            DataParser.filename, `${JSON.stringify(restaurant, null, 4)}`);
                                        console.log(`${index} => Request ended, restaurant ${restaurantId}: ${res.statusCode}`);
                                        if (Number(index) === urls.length - 1 ) {
                                            fs.appendFileSync(DataParser.filename, ']');
                                        } else {
                                            fs.appendFileSync(DataParser.filename, ',');
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
        });
    }

    /**
     *
     * @returns parsed restaurants
     */
    public static getRestaurants(): IRestaurant[] {
        const fileContent = JSON.parse(fs.readFileSync(DataParser.filename).toString());
        const restaurants: IRestaurant[] = [];
        // tslint:disable-next-line: forin
        for (const index in fileContent) {
        const restaurantFile = fileContent[index];
        const addrKeys = Object.keys(restaurantFile.restaurantAddress[0]);
        let complAddr = '';

        for (const i in addrKeys) {
            if (addrKeys[i].indexOf('address') !== -1 && addrKeys[i].indexOf('Type') === -1) {
                const addr = restaurantFile.restaurantAddress[0][addrKeys[i]];
                complAddr += `${addr}`;
                if (+i < addrKeys.length - 1 && addr.length > 1) { // TODO correct ',' at last index
                    complAddr += ', ';
                }
            }
        }
        const addr: IAddress = {
            address: complAddr,
            city: restaurantFile.restaurantAddress[0].city,
            country: restaurantFile.restaurantAddress[0].country,
            zipCode: restaurantFile.restaurantAddress[0].zipCode,
        };
        const restaurant: IRestaurant = {
            _id: +index,
            address: addr,
            coordinates: [restaurantFile.coordinates.latitude, restaurantFile.coordinates.longitude],
            name: restaurantFile.name,
            note: 0,
            visited: false,
        };
        restaurants.push(restaurant);
    }
        return restaurants;
    }

    private static options: any = {
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
        hostname: 'www.mcdonalds.fr',
        maxRedirects: 20,
        method: 'GET',
        path: '/liste-restaurants-mcdonalds-france',
      };
}

export default DataParser;
