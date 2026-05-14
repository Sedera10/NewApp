const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

axios.get('http://localhost:80/prestashop/api/products?display=full&limit=10&ws_key=VMSAS9H1RSPCGH7E3IYRIZP8D6LMBBTN')
  .then(r => {
    const products = parser.parse(r.data).prestashop.products.product;
    const res = products.filter(p => {
      let productCatIds = [];
      if (p.associations && p.associations.categories && p.associations.categories.category) {
        let cats = p.associations.categories.category;
        if (!Array.isArray(cats)) cats = [cats];
        productCatIds = cats.map(c => String((typeof c.id === 'object') ? c.id['#text'] : c.id));
      }
      return productCatIds.includes('3');
    });
    console.log('Found ' + res.length + ' products with category 3');
    if (res.length) console.log(JSON.stringify(res[0].name));
  })
  .catch(console.error);