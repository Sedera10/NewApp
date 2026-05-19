import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { localCartService, cartService } from '../../../service/Cart';
import { customerService } from '../../../service/Customer';
import { productService } from '../../../service/Product';
import { commandeService } from '../../../service/Commande';
import { getAddressesByCustomerId } from '../../../service/Addresse';
import './CartPage.css';

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(0);
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState();
  const [addresse, setAddresse] = useState(null);
  const [paymentModules, setPaymentModules] = useState([])
  const [paymentMethod, setPaymentMethod] = useState();
  const [ carrier, setCarrier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const syncCartToApi = async (nextCartItems) => {
    try {
      const items = Array.isArray(nextCartItems) ? nextCartItems : localCartService.getCart(customerId);
      const itemsToApi = items.map(item => ({
        id_product: item.id,
        id_product_attribute: item.idProductAttribute || item.id_product_attribute || 0,
        quantity: item.quantity,
        id_address_delivery: 0
      }));

      let currentCartId = localStorage.getItem(`current_cart_id_${customerId}`);
      if (itemsToApi.length === 0) {
        if (currentCartId) {
          localStorage.removeItem(`current_cart_id_${customerId}`);
        }
        return;
      }

      if (!currentCartId) {
        const createdCart = await cartService.createCart(customerId, itemsToApi, 1, 1, 0);
        if (createdCart?.id) {
          const newId = typeof createdCart.id === 'object' ? createdCart.id['#text'] : createdCart.id;
          localStorage.setItem(`current_cart_id_${customerId}`, newId);
        }
      } else {
        const payload = {
          id_currency: 1,
          id_lang: 1,
          associations: {
            cart_rows: {
              cart_row: itemsToApi
            }
          }
        };

        if (customerId > 0) {
          payload.id_customer = customerId;
        }

        await cartService.updateCart(currentCartId, payload);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation du panier API:', error);
    }
  };

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('client_session'));
    const userId = currentUser?.id || 0;
    setCustomerId(userId);

    const cartItems = localCartService.getCart(userId);
    setCart(cartItems);
  }, []);

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      const updatedCart = localCartService.updateQuantity(customerId, productId, newQuantity);
      setCart(updatedCart);
      syncCartToApi(updatedCart);
    }
  };

  const handleRemoveFromCart = (productId) => {
    const updatedCart = localCartService.removeFromCart(customerId, productId);
    setCart(updatedCart);
    syncCartToApi(updatedCart);
  };

  const handleClearCart = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider le panier ?')) {
      localCartService.clearCart(customerId);
      setCart([]);
      syncCartToApi([]);
    }
  };

  const handleClick = async () => {
    if (!customerId || customerId === 0) {
      navigate('/mystore/fr');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    const getTextVal = (val) => {
      if (val && typeof val === 'object' && val['#text'] !== undefined) {
        return val['#text'];
      }
      return val;
    };

    try {
      const cartItems = localCartService.getCart(customerId);
      if (!cartItems.length) {
        setSubmitError('Votre panier est vide.');
        return;
      }

      const [custData, custAddresses, modules, carriers] = await Promise.all([
        customerService.getCustomerById(customerId),
        getAddressesByCustomerId(customerId),
        commandeService.getPaymentModules(),
        commandeService.getShippingCarriers()
      ]);

      setCustomerData(custData);

      const addresses = Array.isArray(custAddresses) ? custAddresses : custAddresses ? [custAddresses] : [];
      setAddresse(addresses);
      if (!addresses.length) {
        setSubmitError('Aucune adresse trouvée pour ce client.');
        return;
      }

      const selectedAddress = addresses[0];

      setPaymentModules(modules);
      const selectedModule = modules.length > 0 ? modules[0] : { name: 'ps_cashondelivery', displayName: 'Paiement a la livraison' };
      setPaymentMethod(selectedModule.name);

      setCarrier(carriers);
      const selectedCarrier = carriers.length > 0 ? carriers[0] : { id: 0, price: 0 };

      const itemsToApi = cartItems.map(item => ({
        id_product: item.id,
        id_product_attribute: item.idProductAttribute || item.id_product_attribute || 0,
        quantity: item.quantity,
        id_address_delivery: getTextVal(selectedAddress.id)
      }));

      let currentCartId = localStorage.getItem(`current_cart_id_${customerId}`);
      if (currentCartId) {
        const unorderedCarts = await cartService.getUnorderedCarts(customerId);
        const hasCurrentCart = unorderedCarts.some(cart => String(cart?.id) === String(currentCartId));
        if (!hasCurrentCart) {
          currentCartId = null;
        }
      }

      if (!currentCartId) {
        const createdCart = await cartService.createCart(customerId, itemsToApi, 1, 1, getTextVal(selectedAddress.id));
        if (createdCart?.id) {
          currentCartId = getTextVal(createdCart.id);
          localStorage.setItem(`current_cart_id_${customerId}`, currentCartId);
        }
      } else {
        await cartService.updateCart(currentCartId, {
          id_customer: customerId,
          id_currency: 1,
          id_lang: 1,
          id_address_delivery: getTextVal(selectedAddress.id),
          id_address_invoice: getTextVal(selectedAddress.id),
          id_carrier: selectedCarrier.id,
          associations: {
            cart_rows: {
              cart_row: itemsToApi
            }
          }
        });
      }

      if (!currentCartId) {
        setSubmitError('Impossible de creer le panier courant.');
        return;
      }

      let apiCart = await cartService.getCartById(currentCartId);
      if (!apiCart?.products?.length) {
        const recreatedCart = await cartService.createCart(customerId, itemsToApi, 1, 1, getTextVal(selectedAddress.id));
        if (recreatedCart?.id) {
          currentCartId = getTextVal(recreatedCart.id);
          localStorage.setItem(`current_cart_id_${customerId}`, currentCartId);
          apiCart = await cartService.getCartById(currentCartId);
        }
      }

      if (!apiCart?.products?.length) {
        setSubmitError('Le panier API est vide ou invalide. Verifiez les produits ou les attributs.');
        return;
      }

      const uniqueProductIds = [...new Set(cartItems.map(item => String(item.id)))];
      const productTaxes = await Promise.all(
        uniqueProductIds.map(async (productId) => {
          const rawProduct = await productService.getProductById(productId);
          const formattedProduct = productService.formatProduct(rawProduct);
          return {
            id: String(productId),
            taxRate: Number.parseFloat(formattedProduct?.taxRate || 0) || 0
          };
        })
      );

      const taxRateMap = productTaxes.reduce((acc, item) => {
        acc[item.id] = item.taxRate;
        return acc;
      }, {});

      const totals = cartItems.reduce(
        (acc, item) => {
          const priceTtc = Number.parseFloat(item.price) || 0;
          const qty = Number.parseInt(item.quantity, 10) || 0;
          const taxRate = taxRateMap[String(item.id)] || 0;
          const priceHt = taxRate > 0 ? priceTtc / (1 + taxRate / 100) : priceTtc;
          acc.totalProductsTtc += priceTtc * qty;
          acc.totalProductsHt += priceHt * qty;
          return acc;
        },
        { totalProductsTtc: 0, totalProductsHt: 0 }
      );

      const shippingAmount = selectedCarrier.price || 0;
      const totalWithShippingTtc = totals.totalProductsTtc + shippingAmount;
      const totalWithShippingHt = totals.totalProductsHt + shippingAmount;

      const orderData = {
        id_cart: currentCartId,
        id_customer: customerId,
        id_address_delivery: getTextVal(selectedAddress.id),
        id_address_invoice: getTextVal(selectedAddress.id),
        id_currency: 1,
        id_lang: 1,
        id_carrier: selectedCarrier.id,
        payment: selectedModule.displayName,
        module: selectedModule.name,
        secure_key: getTextVal(custData?.secure_key)
      };

      const orderPayload = {
        ...orderData,
        total_paid: parseFloat(totalWithShippingTtc.toFixed(6)),
        total_paid_real: parseFloat(totalWithShippingTtc.toFixed(6)),
        total_paid_tax_incl: parseFloat(totalWithShippingTtc.toFixed(6)),
        total_paid_tax_excl: parseFloat(totalWithShippingHt.toFixed(6)),
        total_products: parseFloat(totals.totalProductsHt.toFixed(6)),
        total_products_wt: parseFloat(totals.totalProductsTtc.toFixed(6)),
        total_shipping: parseFloat(shippingAmount.toFixed(6)),
        total_shipping_tax_incl: parseFloat(shippingAmount.toFixed(6)),
        total_shipping_tax_excl: parseFloat(shippingAmount.toFixed(6)),
        carrier_tax_rate: 0,
        round_type: 2
      };

      let createdOrder;
      try {
        createdOrder = await commandeService.createOrder(orderPayload);
      } catch (error) {
        const message = String(error?.response?.data || '').toLowerCase();
        if (message.includes('panier ne peut') || message.includes('commande a deja')) {
          const recreatedCart = await cartService.createCart(customerId, itemsToApi, 1, 1, getTextVal(selectedAddress.id));
          if (recreatedCart?.id) {
            currentCartId = getTextVal(recreatedCart.id);
            localStorage.setItem(`current_cart_id_${customerId}`, currentCartId);
            const retryPayload = { ...orderPayload, id_cart: currentCartId };
            createdOrder = await commandeService.createOrder(retryPayload);
          }
        } else {
          throw error;
        }
      }

      if (!createdOrder?.id) {
        setSubmitError('La commande n\'a pas ete creee.');
        return;
      }

      localCartService.clearCart(customerId);
      localStorage.removeItem(`current_cart_id_${customerId}`);

      setSubmitSuccess(`Commande creee avec succes. ID: ${getTextVal(createdOrder.id)}`);
    } catch (error) {
      console.error('Erreur creation commande:', error);
      setSubmitError('Erreur lors de la creation de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = localCartService.getTotalAmount(customerId);
  const totalItems = localCartService.getTotalItems(customerId);

  return (
    <>
      <Header />
      <div className="cart-container">
        <div className="cart-header">
          <h1>Mon Panier</h1>
          <button
            onClick={() => navigate('/mystore/fr/products')}
            className="continue-shopping-btn"
          >
            ← Continuer les achats
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Votre panier est vide</p>
            <button
              onClick={() => navigate('/mystore/fr/products')}
              className="shop-btn"
            >
              Commencer à acheter
            </button>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Prix</th>
                    <th>Quantité</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.id} className="cart-item-row">
                      <td>
                        <div className="product-info">
                          <img src={item.image} alt={item.name} className="product-thumbnail" />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="price">{item.price.toFixed(2)} €</td>
                      <td className="quantity">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="qty-btn"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          min="1"
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="qty-input"
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="qty-btn"
                        >
                          +
                        </button>
                      </td>
                      <td className="total">{(item.price * item.quantity).toFixed(2)} €</td>
                      <td>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={handleClearCart}
                className="clear-cart-btn"
              >
                Vider le panier
              </button>
            </div>

            <div className="cart-summary">
              <h2>Résumé</h2>
              <div className="summary-row">
                <span>Articles ({totalItems}):</span>
                <span>{totalAmount.toFixed(2)} €</span>
              </div>
              <div className="summary-row">
                <span>Frais de port:</span>
                <span>Gratuit</span>
              </div>
              <div className="summary-row total-row">
                <span>Total:</span>
                <span className="total-amount">{totalAmount.toFixed(2)} €</span>
              </div>
              {submitError && <div className="error-message">{submitError}</div>}
              {submitSuccess && <div className="success-message">{submitSuccess}</div>}
              <button
                className="checkout-btn"
                onClick={handleClick}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creation de commande...' : 'Proceder au paiement'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
