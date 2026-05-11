require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const resetRoutes = require('./routes/resetRoutes');

app.use('/api/reset', resetRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Test Backend running on port ${PORT}`);
});