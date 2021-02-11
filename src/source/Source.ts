import { MySQL } from './MySQL';

export type ConnectionOptions = MySQL;
export interface Source{
    name: 'mysql';
    options: ConnectionOptions;
}
