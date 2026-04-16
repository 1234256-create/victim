const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const voteRoutes = require('./routes/votes');
const contributionRoutes = require('./routes/contributions');
const adminRoutes = require('./routes/admin');
const mailRoutes = require('./routes/mail');
const passwordRoutes = require('./routes/password');
const settingsRoutes = require('./routes/settings');
const contentRoutes = require('./routes/content');
const joinRoutes = require('./routes/join');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ server, path: '/ws' });
global.__WSClients = global.__WSClients || new Set();
wss.on('connection', (ws, req) => {
  try {
    global.__WSClients.add(ws);
    console.log(`[WebSocket] Client connected. Total clients: ${global.__WSClients.size}`);
  } catch (err) {
    console.error('[WebSocket] Connection error:', err);
  }
  ws.on('close', () => {
    try {
      global.__WSClients.delete(ws);
      console.log(`[WebSocket] Client disconnected. Total clients: ${global.__WSClients.size}`);
    } catch (err) {
      console.error('[WebSocket] Disconnect error:', err);
    }
  });
  ws.on('error', (err) => {
    console.error('[WebSocket] Client error:', err);
  });
});
global.__wsBroadcast = global.__wsBroadcast || function (payload) {
  try {
    const message = payload || { type: 'users_updated' };
    const clientCount = global.__WSClients.size;
    console.log(`[WebSocket] Broadcasting to ${clientCount} clients:`, message.type);
    for (const ws of global.__WSClients) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message));
      }
    }
  } catch (err) {
    console.error('[WebSocket] Broadcast error:', err);
  }
};
const User = require('./models/User');

// If behind a proxy (including CRA dev server), trust proxy headers
app.set('trust proxy', 1);

// Security middleware (allow cross-origin resource loading and disable frameguard to permit iframes)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false
}));

// Rate limiting disabled for development

// CORS configuration
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static serving for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Static serving for top-level images (branding assets)
app.use('/images', express.static(path.join(__dirname, '../images')));
// Allow embedding documents in iframe by removing X-Frame-Options header for this route
app.use('/documents', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});
app.use('/documents', express.static(path.join(__dirname, '../documents')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doa-voting', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
    const seedAdmin = async () => {
      try {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) return;
        const bcrypt = require('bcryptjs');
        let admin = await User.findOne({ email }).select('+password');
        if (!admin) {
          admin = new User({ firstName: 'Admin', lastName: 'User', email, password, role: 'admin', isActive: true });
          await admin.save();
        } else {
          let changed = false;
          if (admin.role !== 'admin') {
            admin.role = 'admin';
            changed = true;
          }
          if (!admin.isActive) {
            admin.isActive = true;
            changed = true;
          }
          const matchesEnv = await bcrypt.compare(password, admin.password);
          if (!matchesEnv) {
            admin.password = password;
            changed = true;
          }
          if (changed) {
            await admin.save();
          }
        }
      } catch { }
    };
    seedAdmin();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/join', joinRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const clientBuildPath = path.join(__dirname, '../client/build');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({ message: 'API server running', environment: process.env.NODE_ENV || 'development' });
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
