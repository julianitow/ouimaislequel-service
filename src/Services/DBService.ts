import { MongoClient, ServerApiVersion } from 'mongodb';
import IRestaurant from '../Interfaces/IRestaurant';
import IUser from '../Interfaces/IUser';
import DataParser from './DataParser';
class DBService {

    public static newInstance(): DBService {
        if (DBService.instance === undefined) {
            DBService.instance = new DBService();
        }
        return DBService.instance;
    }

    public static getUsers(): Promise<IUser[]> {
        return new Promise<IUser[]>((resolve, reject) => {
            const client = DBService.client;
            client.connect((err) => {
                if (err) { throw err; }
                const db = client.db(DBService.DB_NAME);
                const usersCollection = db.collection('users');
                usersCollection.find({}).toArray().then((users) => {
                    resolve(users as any as IUser[]);
                })
                .catch((err) => reject(err))
                .finally(() => client.close());
            });
        });
    }

    public static getRestaurants(): Promise<IRestaurant[]> {
        return new Promise<IRestaurant[]>((resolve, reject) => {
            const client = DBService.client;
            client.connect((err) => {
                if ( err ) { throw err; }
                const db = client.db(DBService.DB_NAME);
                const collection = db.collection(DBService.DB_RESTAURANTS_COLLECTION);
                collection.find({}).toArray().then((restaurants) => {
                    resolve(restaurants as any as  IRestaurant[]);
                })
                .catch((err) => reject(err))
                .finally(() => client.close());
            });
        });
    }

    public static updateUsers() {
        const users = JSON.parse('[{"username" :"Noémie"}, {"username": "Julien"}]');
        const client = DBService.client;
        client.connect((err) => {
            if ( err ) { throw err; }
            const db = client.db(DBService.DB_NAME);
            const usersCollection = db.collection('users');
            usersCollection.insertMany(users)
            .then((res) => {
                console.log(`'Inserted : ${res.insertedCount}`);
            })
            .catch((err) => { throw err; })
            .finally(() => client.close());
        });
    }

    public static  updateRestaurants() {
        const restaurants = DataParser.getRestaurants();
        const client = DBService.client;
        client.connect((err) => {
            if ( err ) { throw err; }
            const db = client.db(DBService.DB_NAME);
            const restaurantsCollection = db.collection(DBService.DB_RESTAURANTS_COLLECTION);
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

    public static updateRestaurant(restaurant: IRestaurant): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const client = DBService.client;
            client.connect(async (err) => {
                if (err) { reject(err); }
                const db = client.db(DBService.DB_NAME);
                const id = restaurant._id;
                delete restaurant._id;
                const restaurantsCollection = db.collection(DBService.DB_RESTAURANTS_COLLECTION);
                const filter = {_id: +id};
                restaurantsCollection.updateOne(filter, { $set: restaurant}, (err, res) => {
                    if (err) { reject(err); }
                    resolve(res.acknowledged);
                });
             });
        });
    }

    private static instance: DBService;
    private static client: MongoClient;
    private static DB_PASSWORD =  '0LmYkNxjm6X1BnKT';
    private static DB_NAME = 'madonalds';
    private static DB_RESTAURANTS_COLLECTION = 'restaurants';

    private constructor() {
        const uri =
        `mongodb+srv://julianitow:${DBService.DB_PASSWORD}@cluster0.bxrmnii.mongodb.net/?retryWrites=true&w=majority` ;
        DBService.client = new MongoClient(uri, { serverApi: ServerApiVersion.v1});
    }
}

export default DBService;
