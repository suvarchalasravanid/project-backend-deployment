const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const router = require('./routes/auth')
const app = express();

app.use(express.json());
app.use(cors());
mongoose.set('strictQuery', true);
mongoose.connect(config.mongoURI, { useNewUrlParser: true, 
                                    useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/auth',router);
app.use('/auth/restaurant',router);
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

