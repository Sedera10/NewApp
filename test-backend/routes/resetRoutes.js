const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Supprime toutes les données d'une table cible
router.delete('/:table', async (req, res) => {
    const table = req.params.table;
    const allowedTables = ['categories', 'products', 'users'];
    
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: "Table invalide ou non autorisée" });
    }

    try {
        await db.query(`DELETE FROM ${table}`);
        res.json({ message: `Toutes les données de la table ${table} ont été supprimées.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// getAll from one table
router.get('/tables/:table', async (req, res) => {
    const { table } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM \`${table}\``
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
});

router.get('/:table/:id', async (req, res) => {
    const { table, id } = req.params;

    try {
        const [rows] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Élément non trouvé" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Supprime un élément spécifique par son ID (DELETE /api/reset/:table/:id)
router.delete('/:table/:id', async (req, res) => {
    const { table, id } = req.params;

    try {
        const [result] = await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Élément non trouvé ou déjà supprimé" });
        }
        res.json({ message: `L'élément avec l'ID ${id} a été supprimé de la table ${table}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;