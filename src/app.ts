import express from 'express';
import morgan from 'morgan';
import DataParser from './Services/DataParser';
import DBService from './Services/DBService';

const app = express();
app.use(express.json());
app.use(morgan('combined'));

const PORT = 53400;

app.get('/list', (_, res) => {
    DBService.getRestaurants().then((restaurants) => {
        res.send(restaurants);
    });
});

app.get('/users', (_, res) => {
    DBService.getUsers()
    .then((users) => {
        res.send(users);
    })
    .catch((err) => {
        res.status(500).send('An error occured');
    });
});

app.post('/restaurant/:id', async (req, res) => {
    const restaurant = req.body;
    restaurant._id = restaurant.id;
    delete restaurant.id;
    const date = new Date();
    const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
    const month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    const visitedDate = `${day}/${month}/${date.getFullYear()}`;
    restaurant.date = visitedDate;
    DBService.updateRestaurant(restaurant)
    .then((updated) => {
        if (!updated) {
            res.status(404).send('Not foud');
            return;
        }
        res.status(201).send('ok');
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('error');
    });
});

async function main(): Promise<number> {
    if (process.argv.length > 2) {
        DBService.newInstance();
        const params = process.argv.filter((arg, index) => index > 1);
        if (params.includes('--update-data')) {
            console.log('=======UPDATE RESTAURANTS LIST=======');
            await DataParser.fetchRestaurants();
        }

        if (params.includes('--start')) {
            app.listen(PORT, () => {
                console.log(`Mcdo comm api listening on port ${PORT}`);
            });
        }

        if (params.includes('--update-restaurants-db')) {
            DBService.updateRestaurants();
        }

        if (params.includes('--update-users-db')) {
            DBService.updateUsers();
        }
    }
    return 0;
}

main();
