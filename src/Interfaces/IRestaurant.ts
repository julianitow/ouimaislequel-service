import IAddress from './IAddress';

interface IRestaurant {
    _id?: any;
    name: string;
    coordinates: number[];
    address: IAddress;
    visited: boolean;
    note: number;
}

export default IRestaurant;
