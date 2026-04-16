const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format, authorization denied'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found, authorization denied'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated, authorization denied'
        });
      }

      // Add user to request object
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };

      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired, please login again'
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token, authorization denied'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token verification failed, authorization denied'
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Admin authorization middleware
const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format, authorization denied'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found, authorization denied'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated, authorization denied'
        });
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      // Add user to request object
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };

      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired, please login again'
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token, authorization denied'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token verification failed, authorization denied'
        });
      }
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in admin authentication'
    });
  }
};

// Moderator or Admin authorization middleware
const moderatorAuth = async (req, res, next) => {
  try {
    // First run the auth middleware
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is moderator or admin
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Moderator or Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Moderator auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in moderator authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (user && user.isActive) {
        req.user = {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        };
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // Invalid token, continue without user
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

// Role-based authorization middleware factory
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      // First run the auth middleware
      await new Promise((resolve, reject) => {
        auth(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Check if user has required role
      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role auth middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in role authentication'
      });
    }
  };
};

// Check if user owns resource or is admin
const ownerOrAdmin = (resourceUserField = 'user') => {
  return async (req, res, next) => {
    try {
      // First run the auth middleware
      await new Promise((resolve, reject) => {
        auth(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Admin can access anything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.body[resourceUserField] || req.params.userId || req.query.userId;
      
      if (resourceUserId && resourceUserId.toString() === req.user.id.toString()) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });

    } catch (error) {
      console.error('Owner or admin middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in ownership authentication'
      });
    }
  };
};

// Rate limiting by user ID
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return async (req, res, next) => {
    try {
      // First run the auth middleware
      await new Promise((resolve, reject) => {
        auth(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (userRequests.has(userId)) {
        const userRequestTimes = userRequests.get(userId);
        const validRequests = userRequestTimes.filter(time => time > windowStart);
        userRequests.set(userId, validRequests);
      }

      // Check current request count
      const currentRequests = userRequests.get(userId) || [];
      
      if (currentRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      currentRequests.push(now);
      userRequests.set(userId, currentRequests);

      next();
    } catch (error) {
      console.error('User rate limit middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in rate limiting'
      });
    }
  };
};

module.exports = {
  auth,
  adminAuth,
  moderatorAuth,
  optionalAuth,
  requireRole,
  ownerOrAdmin,
  userRateLimit
};