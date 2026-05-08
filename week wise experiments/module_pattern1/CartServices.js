let cart = [];

export function addToCart(product) {
  cart = [...cart, product]; // immutability
}

export function getCart() {
  return cart;
}

