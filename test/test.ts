import { LogicQuery } from '../src/types/Query';
import { replace } from 'lodash';

const test = 'a/b/c/d';

const test2 = test.replace(/\//g, '.');
console.log(test2);
/* 
const query: LogicQuery = {
    $or: [{
        a: 1,
    }]
} */

/* for (let iter = 0; iter < 10; iter ++) {
    console.log(serialUuid(32));
} */