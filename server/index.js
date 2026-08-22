require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const menuRoutes = require('./routes/menu.route');
const orderRoutes = require('./routes/order.route');
const inventoryRoutes = require('./routes/inventory.route');

// Connecting MongoDB Database
mongoose
  .connect(process.env.MONGO_URI)
  .then((x) => {
    console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`);
  })
  .catch((err) => {
    console.error('Error connecting to mongo', err.message);
  });

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors());

// Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all origins
  }
});

io.on('connection', (socket) => {
  console.log('A user connected via socket.io:', socket.id);

  socket.on('table_status_change', (data) => {
    io.emit('table_updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass io to request object BEFORE routes so handlers can emit
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);

// 404 Error
app.use((req, res, next) => {
  res.status(404).send('Not Found');
});

// Global Error Handler
app.use(function (err, req, res, next) {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});

// PORT
const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log('Connected to port ' + port);
});
