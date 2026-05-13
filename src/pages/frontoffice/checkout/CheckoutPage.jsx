import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import CommandeStep from '../../../components/checkout/CommandeStep';
import { localCartService } from '../../../service/Cart';
import { cartService } from '../../../service/cartService';
import { getCustomerById } from '../../../service/Customer';
import { getAddressesByCustomerId, createAddress } from '../../../service/Addresse';
import { commandeService } from '../../../service/Commande';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderError, setOrderError] = useState('');

  const steps = ['Infos personnelles', 'Adresse de livraison', 'Mode de paiement', 'Confirmation'];

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    firstname: '',
    lastname: '',
    email: ''
  });

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    firstname: '',
    lastname: '',
    address1: '',
    city: '',
    postcode: '',
    country: 'FR'
  });

  const [paymentModules, setPaymentModules] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  useEffect(() => {
    const initCheckout = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('client_session'));
        console.log('Current user from session:', currentUser);

        if (!currentUser?.isLoggedIn) {
          navigate('/mystore/fr/login');
          return;
        }

        const cartItems = localCartService.getCart(currentUser.id);
        if (cartItems.length === 0) {
          navigate('/mystore/fr/cart');
          return;
        }

        setCustomer(currentUser);
        setCart(cartItems);

        const custData = await getCustomerById(currentUser.id);
        setCustomerData(custData);

        const getTextVal = (val) => {
          if (val && typeof val === 'object' && val['#text'] !== undefined) {
            return val['#text'];
          }
          return val;
        };

        setPersonalInfo({
          firstname: getTextVal(custData.firstname) || '',
          lastname: getTextVal(custData.lastname) || '',
          email: getTextVal(custData.email) || ''
        });

        const custAddresses = await getAddressesByCustomerId(currentUser.id);
        console.log('Addresses fetched for customer', currentUser.id, ':', custAddresses);
        setAddresses(custAddresses);
        if (custAddresses.length > 0) {
          console.log('Setting selected address to:', custAddresses[0]);
          setSelectedAddress(custAddresses[0]);
        }

        // Fetch payment modules
        const modules = await commandeService.getPaymentModules();
        console.log('Payment modules:', modules);
        setPaymentModules(modules);
        if (modules.length > 0) {
          setPaymentMethod(modules[0].name);
        }
      } catch (error) {
        console.error('Error initializing checkout:', error);
      } finally {
        setLoading(false);
      }
    };

    initCheckout();
  }, [navigate]);

  const handleContinuePersonalInfo = () => {
    if (personalInfo.firstname && personalInfo.lastname && personalInfo.email) {
      setCurrentStep(1);
    }
  };

  const handleContinueAddress = async () => {
    if (selectedAddress || (newAddress.firstname && newAddress.address1 && newAddress.city && newAddress.postcode)) {
      if (newAddress.firstname && !selectedAddress) {
        try {
          const addressPayload = {
            id_customer: customer.id,
            id_country: 8,
            firstname: newAddress.firstname,
            lastname: newAddress.lastname || personalInfo.lastname,
            address1: newAddress.address1,
            address2: '',
            city: newAddress.city,
            postcode: newAddress.postcode,
            phone: '',
            phone_mobile: '',
            other: '',
            active: 1
          };

          console.log('Creating address with payload:', addressPayload);
          const createdAddress = await createAddress(addressPayload);
          console.log('Address created:', createdAddress);
          setSelectedAddress(createdAddress);
        } catch (error) {
          console.error('Error creating address:', error);
          setOrderError('Erreur lors de la création de l\'adresse');
          return;
        }
      }
      setCurrentStep(2);
    }
  };

  const handleCreateOrder = async () => {
    if (!agreeToTerms) {
      setOrderError('Veuillez accepter les conditions générales');
      return;
    }

    try {
      setOrderError('');
      const totalAmount = localCartService.getTotalAmount(customer.id);

      const getTextVal = (val) => {
        if (val && typeof val === 'object' && val['#text'] !== undefined) {
          return val['#text'];
        }
        return val;
      };

      // Prepare cart items
      const cartItems = cart.map(item => ({
        id_product: item.id,
        id_product_attribute: 0,
        quantity: item.quantity
      }));

      // Step 1: Create a cart in Prestashop
      console.log('Step 1: Creating cart in Prestashop...');
      console.log('Cart items to add:', cartItems);

      const cartInPrestashop = await cartService.createCart(
        customer.id,
        cartItems,
        1,
        1
      );

      console.log('Cart response from API:', cartInPrestashop);

      const cartId = getTextVal(cartInPrestashop.id);
      console.log('Cart created with ID:', cartId);

      // Verify cart was created
      if (!cartId) {
        throw new Error('Panier non créé - ID manquant');
      }

      // Step 2: Create the order with the cart
      console.log('Step 2: Creating order with cart...');
      const orderData = {
        id_cart: cartId,
        id_customer: customer.id,
        id_address_delivery: getTextVal(selectedAddress.id),
        id_address_invoice: getTextVal(selectedAddress.id),
        payment: paymentModules.find(m => m.name === paymentMethod)?.displayName || paymentMethod,
        module: paymentMethod,
        total_paid: totalAmount,
        total_products: totalAmount,
        items: cart.map(item => ({
          id_product: item.id,
          product_name: item.name,
          quantity: item.quantity,
          product_price: item.price
        }))
      };

      const createdOrder = await commandeService.createOrder(orderData);
      console.log('Order created:', createdOrder);

      localCartService.clearCart(customer.id);
      navigate('/mystore/fr', {
        state: { orderSuccess: true, orderId: getTextVal(createdOrder?.id) }
      });
    } catch (error) {
      console.error('Error creating order:', error);
      setOrderError('Erreur lors de la création de la commande. Veuillez réessayer.');
    }
  };

  if (loading) return <div>Chargement...</div>;

  const totalAmount = localCartService.getTotalAmount(customer?.id || 0);
  const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
      return val['#text'];
    }
    return val;
  };

  return (
    <>
      <Header />
      <div className="checkout-container">
        <div className="checkout-header">
          <h1>Passer la commande</h1>
        </div>

        <CommandeStep steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="checkout-content">
          <div className="checkout-main">
            {/* Step 1: Personal Info */}
            {currentStep === 0 && (
              <div className="checkout-step">
                <h2>Informations personnelles</h2>
                <div className="form-group">
                  <label>Prénom</label>
                  <input
                    type="text"
                    value={personalInfo.firstname}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, firstname: e.target.value })}
                    placeholder="Votre prénom"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={personalInfo.lastname}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, lastname: e.target.value })}
                    placeholder="Votre nom"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    placeholder="Votre email"
                    disabled
                  />
                </div>
                <p className="info-text">Ces informations sont déjà enregistrées dans votre compte.</p>
                <button onClick={handleContinuePersonalInfo} className="btn-continue">
                  Continuer vers l'adresse
                </button>
              </div>
            )}

            {/* Step 2: Address */}
            {currentStep === 1 && (
              <div className="checkout-step">
                <h2>Adresse de livraison</h2>

                {addresses.length === 0 && (
                  <div className="info-text" style={{ background: '#fff3cd', borderColor: '#ffc107' }}>
                    ⚠️ Aucune adresse trouvée. Veuillez en créer une.
                  </div>
                )}

                {addresses.length > 0 && (
                  <div className="existing-addresses">
                    <h3>Mes adresses existantes</h3>
                    {addresses.map((addr) => {
                      const addrId = getTextVal(addr.id);
                      const selectedId = selectedAddress ? getTextVal(selectedAddress.id) : null;
                      return (
                        <label key={addrId} className="address-option">
                          <input
                            type="radio"
                            checked={addrId === selectedId}
                            onChange={() => {
                              console.log('Selected address:', addr);
                              setSelectedAddress(addr);
                            }}
                          />
                          <div className="address-info">
                            <span className="address-name">{getTextVal(addr.firstname)} {getTextVal(addr.lastname)}</span>
                            <span className="address-street">{getTextVal(addr.address1)}</span>
                            <span className="address-city">{getTextVal(addr.postcode)} {getTextVal(addr.city)}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="new-address-form">
                  <h3>Ou créer une nouvelle adresse</h3>
                  <div className="form-group">
                    <label>Prénom</label>
                    <input
                      type="text"
                      value={newAddress.firstname}
                      onChange={(e) => setNewAddress({ ...newAddress, firstname: e.target.value })}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom</label>
                    <input
                      type="text"
                      value={newAddress.lastname}
                      onChange={(e) => setNewAddress({ ...newAddress, lastname: e.target.value })}
                      placeholder="Nom"
                    />
                  </div>
                  <div className="form-group">
                    <label>Adresse</label>
                    <input
                      type="text"
                      value={newAddress.address1}
                      onChange={(e) => setNewAddress({ ...newAddress, address1: e.target.value })}
                      placeholder="Rue, numéro"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Code postal</label>
                      <input
                        type="text"
                        value={newAddress.postcode}
                        onChange={(e) => setNewAddress({ ...newAddress, postcode: e.target.value })}
                        placeholder="Code postal"
                      />
                    </div>
                    <div className="form-group">
                      <label>Ville</label>
                      <input
                        type="text"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        placeholder="Ville"
                      />
                    </div>
                  </div>
                </div>

                <button onClick={handleContinueAddress} className="btn-continue">
                  Continuer vers le paiement
                </button>
              </div>
            )}

            {/* Step 3: Payment Method */}
            {currentStep === 2 && (
              <div className="checkout-step">
                <h2>Mode de paiement</h2>
                <div className="payment-options">
                  {paymentModules.length === 0 ? (
                    <p style={{ color: '#666' }}>Aucun mode de paiement disponible.</p>
                  ) : (
                    paymentModules.map(module => (
                      <label key={module.name} className="payment-option">
                        <input
                          type="radio"
                          value={module.name}
                          checked={paymentMethod === module.name}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <div className="payment-info">
                          <span className="payment-name">{module.displayName}</span>
                          <span className="payment-desc">{module.name}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <button onClick={() => setCurrentStep(3)} className="btn-continue">
                  Confirmer la commande
                </button>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 3 && (
              <div className="checkout-step">
                <h2>Confirmation de la commande</h2>

                <div className="order-review">
                  <div className="review-section">
                    <h3>Articles commandés</h3>
                    <table className="review-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Quantité</th>
                          <th>Prix</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            <td>{item.price.toFixed(2)} €</td>
                            <td>{(item.price * item.quantity).toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="review-section">
                    <h3>Adresse de livraison</h3>
                    {selectedAddress && (
                      <div className="review-address">
                        <p>{getTextVal(selectedAddress.firstname)} {getTextVal(selectedAddress.lastname)}</p>
                        <p>{getTextVal(selectedAddress.address1)}</p>
                        <p>{getTextVal(selectedAddress.postcode)} {getTextVal(selectedAddress.city)}</p>
                      </div>
                    )}
                  </div>

                  <div className="review-section">
                    <h3>Mode de paiement</h3>
                    <p>
                      {paymentModules.find(m => m.name === paymentMethod)?.displayName || paymentMethod}
                    </p>
                  </div>

                  {orderError && <div className="error-message">{orderError}</div>}

                  <div className="terms-agree">
                    <label>
                      <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                      />
                      J'accepte les conditions générales et la politique de confidentialité
                    </label>
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={!agreeToTerms}
                    className="btn-confirm-order"
                  >
                    Confirmer et payer ({totalAmount.toFixed(2)} €)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Order Summary */}
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h3>Résumé de la commande</h3>
              <div className="summary-items">
                {cart.map((item) => (
                  <div key={item.id} className="summary-item">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className="summary-divider"></div>
              <div className="summary-total">
                <span>Total:</span>
                <span className="total-amount">{totalAmount.toFixed(2)} €</span>
              </div>
              <div className="summary-shipping">
                <span>Frais de port:</span>
                <span>Gratuit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
