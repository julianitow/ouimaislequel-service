import IAddress from './IAddress';

interface IRestaurant {
    _id?: any;
    name: string;
    coordinates: number[];
    address: IAddress;
    visited: boolean;
    String?: Date;
    note: number;
}

export default IRestaurant;
