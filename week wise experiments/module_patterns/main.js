import { add,get,reset } from './score.js';

add(10);
add(5);
console.log(get()); // 15
reset();
console.log(get()); // 0
