import { MySQL } from './MySQL';
export declare type ConnectionOptions = MySQL;
export interface Source {
    name: 'mysql';
    options: ConnectionOptions;
}
