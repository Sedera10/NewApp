import api from "./api";
import { xmlToJson, buildPrestashopXml } from "./Util";
import { productService } from "./Product";
import { customerService } from "./Customer";

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
                const customer = await customerService.getCustomerById(idCustomer);
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
            const productAttributeId = parseInt(getTextVal(row.id_product_attribute), 10) || 0;

            if (productId) {
                const rawProduct = await productService.getProductById(productId);
                const formattedProduct = productService.formatProduct(rawProduct);
                if (formattedProduct) {
                    const price = parseFloat(formattedProduct.price) || 0;
                    total += price * qty;

                    return {
                        id: productId,
                        idProductAttribute: productAttributeId,
                        name: formattedProduct.name,
                        price: price,
                        image: formattedProduct.image,
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
    },

    getUnorderedCarts: async (idCustomer) => {
        try {
            const [cartResponse, orderResponse] = await Promise.all([
                api.get(`/carts?display=full&filter[id_customer]=${idCustomer}&sort=[id_DESC]`),
                api.get('/orders?display=full')
            ]);

            const cartJson = xmlToJson(cartResponse.data);
            const orderJson = xmlToJson(orderResponse.data);

            let carts = cartJson?.prestashop?.carts?.cart;
            let orders = orderJson?.prestashop?.orders?.order;

            if (!carts) return [];

            const cartArray = Array.isArray(carts) ? carts : [carts];
            const orderArray = Array.isArray(orders) ? orders : orders ? [orders] : [];
            const orderedCartIds = new Set(
                orderArray
                    .map((order) => getTextVal(order?.id_cart))
                    .filter((cartId) => cartId !== null && cartId !== undefined && String(cartId).trim() !== '')
                    .map((cartId) => String(cartId))
            );

            return cartArray.filter((cart) => {
                const cartId = String(getTextVal(cart?.id) || '').trim();
                return cartId && !orderedCartIds.has(cartId);
            });
        } catch (error) {
            console.error(`Erreur getUnorderedCarts pour client ${idCustomer}:`, error);
            return [];
        }
    },

    getLastCart: async (idCustomer) => {
        const unorderedCarts = await cartService.getUnorderedCarts(idCustomer);
        return unorderedCarts.length > 0 ? unorderedCarts[0] : null;
    }
};

// --- GESTION DU PANIER LOCAL (SESSION CLIENT) ---
const getLocalCartKey = (customerId = 0) => `prestashop_local_cart_${customerId}`;

const notifyCartUpdated = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('local-cart-updated'));
};

export const localCartService = {
    getCart: (customerId = 0) => {
        const cartStr = localStorage.getItem(getLocalCartKey(customerId));
        return cartStr ? JSON.parse(cartStr) : [];
    },

    addToCart: (customerId = 0, product, quantity = 1) => {
        let cart = localCartService.getCart(customerId);
        const existingIndex = cart.findIndex(item => item.id === product.id);
        const normalizedAttributeId = product?.idProductAttribute ?? product?.id_product_attribute ?? 0;

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                idProductAttribute: normalizedAttributeId,
                name: product.name,
                price: parseFloat(product.price),
                image: product.image,
                quantity: quantity
            });
        }

        localStorage.setItem(getLocalCartKey(customerId), JSON.stringify(cart));
        notifyCartUpdated();
        return cart;
    },

    setCart: (customerId = 0, items = []) => {
        const normalizedItems = Array.isArray(items) ? items.map((item) => ({
            id: item.id,
            idProductAttribute: item.idProductAttribute ?? item.id_product_attribute ?? 0,
            name: item.name,
            price: parseFloat(item.price || 0),
            image: item.image || '',
            quantity: parseInt(item.quantity, 10) || 0
        })) : [];

        localStorage.setItem(getLocalCartKey(customerId), JSON.stringify(normalizedItems));
        notifyCartUpdated();
        return normalizedItems;
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
            notifyCartUpdated();
        }
        return cart;
    },

    removeFromCart: (customerId = 0, productId) => {
        let cart = localCartService.getCart(customerId);
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem(getLocalCartKey(customerId), JSON.stringify(cart));
        notifyCartUpdated();
        return cart;
    },

    clearCart: (customerId = 0) => {
        localStorage.removeItem(getLocalCartKey(customerId));
        notifyCartUpdated();
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
