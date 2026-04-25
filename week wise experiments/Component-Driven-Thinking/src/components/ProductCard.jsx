function ProductCard({name,price,image}) 
{
  return (
        <div className="card">
        <img src={image} />
        <h3>{name}</h3>
        <p>{price}</p>
      </div>
  );
}

export default ProductCard;