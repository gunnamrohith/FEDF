import { getProductById } from './ProductServices.js';
import { addToCart, getCart } from './CartServices.js';
import { calculateTotal } from './utils.js';

// Add items
const product1 = getProductById(1);
const product2 = getProductById(2);

addToCart(product1);
addToCart(product2);

// Show cart
const cart = getCart();
console.log("Cart:", cart);

// Total price
console.log("Total:", calculateTotal(cart));
