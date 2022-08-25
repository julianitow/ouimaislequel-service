import express from 'express';
import fs from 'fs';
import https from 'https';
import jsdom from 'jsdom';
import { MongoClient, ServerApiVersion } from 'mongodb';
import IAddress from './Interfaces/IAddress';
import IRestaurant from './Interfaces/IRestaurant';
import IUser from './Interfaces/IUser';

const { JSDOM } = jsdom;
const app = express();
app.use(express.json());

const PORT = 3000;
const DB_PASSWORD = '0LmYkNxjm6X1BnKT';
const DB_NAME = 'madonalds';
const DB_RESTAURANTS_COLLECTION = 'restaurants';
const filename = 'macdo-restaurants-paris.json';

const options: any = {
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

app.get('/list', (_, res) => {
    fetchRestaurantsFromDb().then((restaurants) => {
        res.send(restaurants);
    });
});

app.get('/users', (_, res) => {
    fetchUsersFromDb()
    .then((users) => {
        res.send(users);
    })
    .catch((err) => {
        throw err;
    });
});

app.post('/restaurant/:id', (req, res) => {
    console.log(req.params.id);
    console.log(req.body);
    res.send(req.body);
});

function parseRestaurants(): IRestaurant[] {
    const fileContent = JSON.parse(fs.readFileSync(filename).toString());
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
            adress: complAddr,
            city: restaurantFile.restaurantAddress[0].city,
            country: restaurantFile.restaurantAddress[0].country,
            zipCode: restaurantFile.restaurantAddress[0].zipCode,
        };
        const restaurant: IRestaurant = {
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

function dbClient(): MongoClient {
    const uri = `mongodb+srv://julianitow:${DB_PASSWORD}@cluster0.bxrmnii.mongodb.net/?retryWrites=true&w=majority` ;
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    return client;
}

function fetchUsersFromDb(): Promise<IUser[]> {
    return new Promise<IUser[]>((resolve, reject) => {
        const client = dbClient();
        client.connect((err) => {
            if (err) { throw err; }
            const db = client.db(DB_NAME);
            const usersCollection = db.collection('users');
            usersCollection.find({}).toArray().then((users) => {
                resolve(users as any as IUser[]);
            });
        });
    });
}

function fetchRestaurantsFromDb(): Promise<IRestaurant[]> {
    return new Promise<IRestaurant[]>((resolve, reject) => {
        const client = dbClient();
        client.connect((err) => {
            if ( err ) { throw err; }
            const db = client.db(DB_NAME);
            const collection = db.collection(DB_RESTAURANTS_COLLECTION);
            collection.find({}).toArray().then((restaurants) => {
                resolve(restaurants as any as  IRestaurant[]);
            });
        });
    });
}

function updateUsersDatabase() {
    const users = JSON.parse('[{"username" :"Noémie"}, {"username": "Julien"}]');
    const client = dbClient();
    client.connect((err) => {
        if ( err ) { throw err; }
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        usersCollection.insertMany(users)
        .then((res) => {
            console.log(`'Inserted : ${res.insertedCount}`);
        })
        .catch((err) => { throw err; });
    });
}

function updateRestaurantsDatabase() {
    const restaurants = parseRestaurants();
    const client = dbClient();
    client.connect((err) => {
        if ( err ) { throw err; }
        const db = client.db(DB_NAME);
        const restaurantsCollection = db.collection(DB_RESTAURANTS_COLLECTION);
        restaurantsCollection.deleteMany({})
        .then((res) => {
            console.log(`Deleted ${res.deletedCount} elements`);
            restaurantsCollection.insertMany(restaurants)
            .then((res) => {
                console.log(`Inserted ${res.insertedCount} elements`);
                client.close();
            })
            .catch((err) => { throw  err; });
        })
        .catch((err) => {throw err; });
    });
}

async function main(): Promise<number> {
    if (process.argv.length > 2) {
        const params = process.argv.filter((arg, index) => index > 1);
        if (params.includes('--update-data')) {
            console.log('=======UPDATE RESTAURANTS LIST=======');
            await fetchRestaurants();
        }

        if (params.includes('--start')) {
            app.listen(PORT, () => {
                console.log(`Mcdo comm api listening on port ${PORT}`);
            });
        }

        if (params.includes('--update-restaurants-db')) {
            updateRestaurantsDatabase();
        }

        if (params.includes('--update-users-db')) {
            updateUsersDatabase();
        }
    }
    return 0;
}

main();
