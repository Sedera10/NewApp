import { parseCSVWithPapa } from '../Global';

export const shouldAbortOnError = (error) => error?.isValidationError === true;

export const extractCategories = (csvData) => {
  const categories = {};
  csvData.forEach((row) => {
    const catName = row.categorie?.trim();
    if (catName && !categories[catName]) {
      categories[catName] = true;
    }
  });
  return Object.keys(categories);
};

export const extractTaxes = (csvData) => {
  const taxes = {};
  csvData.forEach((row) => {
    const taxRate = row.Taxe?.trim();
    if (taxRate && !taxes[taxRate]) {
      taxes[taxRate] = `TVA ${taxRate}`;
    }
  });
  return taxes;
};

const FILE1_SCHEMA = {
  label: 'Fichier 1',
  expectedHeaders: [
    'date_availability_produit',
    'nom',
    'reference',
    'prix_ttc',
    'Taxe',
    'categorie',
    'prix_achat'
  ],
  fieldMap: {
    dateavailabilityproduit: 'date_availability_produit',
    nom: 'nom',
    reference: 'reference',
    prixttc: 'prix_ttc',
    taxe: 'Taxe',
    categorie: 'categorie',
    prixachat: 'prix_achat'
  }
};

export const parseFile1CSV = (file) => parseCSVWithPapa(file, FILE1_SCHEMA);
