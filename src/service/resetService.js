import api from './api';
import axios from 'axios';

// Utilisation du backend de test local (port 5000)
const BASE_URL = 'http://localhost:5000/api/reset';
const apiTest = axios.create({
  baseURL: BASE_URL
});

export const resetTable = async (tableName) => {
    const response = await apiTest.get(`/tables/${tableName}`);
    const lignes = response.data;
    for (const ligne of lignes) {
        await apiTest.delete(`/${tableName}/${ligne.id}`);
    }
};

export const resetData = async (tablesArray) => {
  try {
    for (const tableName of tablesArray) {
        await resetTable(tableName);
    }
  } catch (error) {
    console.error("Erreur pendant la suppression :", error);
    throw error;
  }
};
