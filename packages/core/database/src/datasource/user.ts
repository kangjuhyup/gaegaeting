import { DataSource } from 'typeorm';
import { join } from 'path';

export const LetterDataSource = (param: {
  type: any;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
}) =>
  new DataSource({
    ...param,
    entities: [join(__dirname, '../entity/**/*.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    logging : process.env.NODE_ENV === 'production' ? false : true,
  });
