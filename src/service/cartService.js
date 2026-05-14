import api from "./api";
import { xmlToJson, buildPrestashopXml } from "./Util";
import { productService } from "./Product";
import { getCustomerById } from "./Customer";

const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
        return val['#text'];
    }
    return val;
};

export const cartService = {
    getCarts: async () => {
        try {
            const response = await api.get('/carts?display=full');
            const jsonObj = xmlToJson(response.data);
            let carts = jsonObj?.prestashop?.carts?.cart || [];
            if (!Array.isArray(carts)) carts = [carts];

            const formattedCarts = await Promise.all(carts.map(async (cart) => {
                return await cartService.formatCart(cart);
            }));

            return formattedCarts;
        } catch (error) {
            console.error("Erreur lors de la récupération des paniers:", error);
            return [];
        }
    },

    getCartById: async (id) => {
        try {
            const response = await api.get(`/carts/${id}?display=full`);
            const jsonObj = xmlToJson(response.data);
            const cart = jsonObj?.prestashop?.cart || null;
            if (cart) {
                return await cartService.formatCart(cart);
            }
            return null;
        } catch (error) {
            console.error(`Erreur lors de la récupération du panier ${id}:`, error);
            return null;
        }
    },

    formatCart: async (cart) => {
        if (!cart) return null;

        const id = getTextVal(cart.id);
        const idCustomer = getTextVal(cart.id_customer);
        const dateAdd = getTextVal(cart.date_add);

        let customerName = `Client #${idCustomer}`;
        try {
            if (idCustomer !== '0') {
                const customer = await getCustomerById(idCustomer);
                customerName = `${customer.firstname} ${customer.lastname}`;
            } else {
                customerName = "Visiteur (Non connecté)";
            }
        } catch (err) { }

        let cartRows = cart?.associations?.cart_rows?.cart_row || [];
        if (!Array.isArray(cartRows)) cartRows = [cartRows];

        let total = 0;
        const productsInfo = await Promise.all(cartRows.map(async (row) => {
            const productId = getTextVal(row.id_product);
            const qty = parseInt(getTextVal(row.quantity), 10) || 0;

            if (productId) {
                const rawProduct = await productService.getProductById(productId);
                const formattedProduct = productService.formatProduct(rawProduct);
                if (formattedProduct) {
                    const price = parseFloat(formattedProduct.price) || 0;
                    total += price * qty;

                    return {
                        id: productId,
                        name: formattedProduct.name,
                        price: price,
                        quantity: qty,
                        totalPrice: price * qty
                    };
                }
            }
            return null;
        }));

        return {
            id,
            idCustomer,
            customerName,
            dateAdd,
            products: productsInfo.filter(p => p !== null),
            totalAmount: total.toFixed(2)
        };
    },

    createCart: async (idCustomer = 0, items = [], idCurrency = 1, idLang = 1, addressId) => {
        try {
            const cartData = {
                id_currency: idCurrency,
                id_lang: idLang,
                id_address_delivery: addressId,
                id_address_invoice: addressId
            };

            if (idCustomer > 0) {
                cartData.id_customer = idCustomer;
            }

            if (items && items.length > 0) {
                cartData.associations = {
                    cart_rows: {
                        cart_row: items.map(item => ({
                            id_product: item.id_product,
                            id_product_attribute: item.id_product_attribute || 0,
                            id_address_delivery: item.id_address_delivery || 0,
                            quantity: item.quantity
                        }))
                    }
                };
            }

            console.log('Creating cart with data:', cartData);
            const xmlPayload = buildPrestashopXml('cart', cartData);
            console.log('Cart XML Payload:', xmlPayload);

            const response = await api.post('/carts', xmlPayload, {
                headers: {
                    'Content-Type': 'application/xml'
                }
            });

            const jsonObj = xmlToJson(response.data);
            console.log('Cart created response:', jsonObj);
            return jsonObj?.prestashop?.cart;
        } catch (error) {
            console.error("Erreur lors de la création du panier:", error);
            console.error("Error response:", error.response?.data);
            throw error;
        }
    },

    updateCart: async (idCart, cartData) => {
        try {
             const payload = {
                id: idCart,
                ...cartData
             };

             console.log('Update cart payload:', payload);
             const xmlPayload = buildPrestashopXml('cart', payload);
             console.log('Update cart XML:', xmlPayload);

             const response = await api.put(`/carts/${idCart}`, xmlPayload, {
                headers: {
                    'Content-Type': 'application/xml'
                }
             });

             const jsonObj = xmlToJson(response.data);
             console.log('Cart update response:', jsonObj);
             return jsonObj?.prestashop?.cart;
        } catch (error) {
             console.error(`Erreur lors de la mise à jour du panier ${idCart}:`, error);
             console.error("Error response data:", error.response?.data);
             throw error;
        }
    }
};

// --- GESTION DU PANIER LOCAL (SESSION CLIENT) ---
const getLocalCartKey = (customerId = 0) => `prestashop_local_cart_${customerId}`;

export const localCartService = {
    getCart: (customerId = 0) => {
        const cartStr = localStorage.getItem(getLocalCartKey(customerId));
        return cartStr ? JSON.parse(cartStr) : [];
    },

    addToCart: (customerId = 0, product, quantity = 1) => {
        let cart = localCartService.getCart(customerId);
        const existingIndex = cart.findIndex(item => item.id === product.id);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                image: product.image,
                quantity: quantity
            });
        }

        localStorage.setItem(getLocalCartKey(customerId), JSON.stringify(cart));
        return cart;
    },

    updateQuantity: (customerId = 0, productId, quantity) => {
        let cart = localCartService.getCart(customerId);
        const existingIndex = cart.findIndex(item => item.id === productId);

        if (existingIndex > -1) {
            if (quantity <= 0) {
                cart.splice(existingIndex, 1);
            } else {
                cart[existingIndex].quantity = quantity;
            }
            localStorage.setItem(getLocalCartKey(customerId), JSON.stringify(cart));
        }
        return cart;
    },

    removeFromCart: (customerId = 0, productId) => {
        let cart = localCartService.getCart(customerId);
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem(getLocalCartKey(customerId), JSON.stringify(cart));
        return cart;
    },

    clearCart: (customerId = 0) => {
        localStorage.removeItem(getLocalCartKey(customerId));
    },

    getTotalAmount: (customerId = 0) => {
        const cart = localCartService.getCart(customerId);
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    getTotalItems: (customerId = 0) => {
        const cart = localCartService.getCart(customerId);
        return cart.reduce((total, item) => total + item.quantity, 0);
    },

    formatForPrestashop: (customerId = 0) => {
        const cart = localCartService.getCart(customerId);
        return cart.map(item => ({
            id_product: item.id,
            quantity: item.quantity,
            id_product_attribute: 0
        }));
    }
};
