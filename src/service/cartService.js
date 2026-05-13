


export const getCartKey = (customerId) => {
  return `cart_${customerId}`;
};

export const getCart = (customerId) => {
  const key = getCartKey(customerId);
  const cart = localStorage.getItem(key);
  return cart ? JSON.parse(cart) : [];
};


export const saveCart = (customerId, cart) => {
  const key = getCartKey(customerId);
  localStorage.setItem(key,JSON.stringify(cart));
};

export const addToCart = (
  customerId,
  product,
  quantity = 1
) => {

  const cart = getCart(customerId);

  const existingProduct = cart.find(
    item => item.id === product.id
  );

  if (existingProduct) {

    existingProduct.quantity += quantity;

  } else {

    cart.push({
      ...product,
      quantity
    });
  }

  saveCart(customerId, cart);

  return cart;
};