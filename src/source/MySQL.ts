export interface MySQL {
    host: string;    
    database: string;
    user: string;
    password?: string;
    charset?: string;
    connectionLimit: number;
}