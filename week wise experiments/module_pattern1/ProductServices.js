export const products = [
  { id: 1, name: "Laptop", price: 50000 },
  { id: 2, name: "Phone", price: 20000 }
];

export function getProductById(id) {
  return products.find(p => p.id === id);
}
