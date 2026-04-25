import { useState } from 'react'
import ProductCard from './components/ProductCard'
import './App.css'

function App() {
  return(
    <div>
      <h1>My Shop</h1>
      <ProductCard name="Phone" price={180000} image="cdt1.png"/>
      <ProductCard name="Headset" price={100000} image="cdt2.png"/>
      <ProductCard name="Laptop" price={160000} image="cdt3.png"/>
    </div>
  );
}

export default App;
