import { Source } from '../../src/source/Source';

export const mysql: Source = {
    name: 'mysql',
    options: {
        host: 'localhost',
        database: 'testOrm',
        user: 'root',
        charset: 'utf8mb4_general_ci',
        connectionLimit: 30,
    },
};
