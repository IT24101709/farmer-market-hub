const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to generate Access JWT — override with JWT_EXPIRES_IN (e.g. 15m, 24h, 7d)
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Helper to generate Refresh JWT (Long-lived)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', {
    expiresIn: '7d', // 7 days
  });
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
      }
      
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.status === 'Suspended') {
        return res.status(403).json({ message: 'Account suspended' });
      }

      const newAccessToken = generateAccessToken(user._id);
      // Optional: Generate a new refresh token here for rotation, but we'll stick to simple return
      
      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, profileDetails } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: '❌ Please fill in all required fields (*).' });
    }

    if (role !== 'Farmer' && role !== 'Customer') {
      return res.status(400).json({ message: '❌ Role must be either Farmer or Customer.' });
    }

    if (!/^[a-zA-Z\s]{3,50}$/.test(name)) {
      return res.status(400).json({ message: '❌ Full Name must be 3-50 characters with no special symbols.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '❌ Please enter a valid email address.' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: '❌ Password must contain 8+ chars, uppercase, number & symbol.' });
    }

    // Phone validation: Required for Farmers, optional for Customers
    const phone = profileDetails?.phone || '';
    if (role === 'Farmer') {
      if (!phone || !/^\d{10,15}$/.test(phone)) {
        return res.status(400).json({ message: '❌ Enter a valid 10-digit mobile number.' });
      }
    } else if (phone && !/^\d{10,15}$/.test(phone)) {
      // If phone is provided for Customer, validate it
      return res.status(400).json({ message: '❌ Enter a valid 10-digit mobile number.' });
    }

    if (role === 'Farmer') {
      const businessName = profileDetails?.businessName || '';
      if (!businessName || businessName.length > 100) {
        return res.status(400).json({ message: '❌ Farm Name is required and must be under 100 characters.' });
      }
    }

    if (role === 'Customer') {
      const address = profileDetails?.address || '';
      if (address && address.length > 200) {
        return res.status(400).json({ message: '❌ Address must be under 200 characters.' });
      }
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: '❌ A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userRole = role || 'Customer'; // Admin must be created manually or via specific secure endpoint usually, but we allow Farmers and Customers here.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      profileDetails
    });

    if (user) {
      // For farmers, they need admin approval before they can login
      const isFarmerAwaitingApproval = user.role === 'Farmer' && !user.isApproved;
      
      const response = {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      };
      
      if (!isFarmerAwaitingApproval) {
        response.accessToken = generateAccessToken(user._id);
        response.refreshToken = generateRefreshToken(user._id);
      }
      
      if (isFarmerAwaitingApproval) {
        response.message = 'Registration successful! Please wait for admin approval before you can login.';
      }
      
      res.status(201).json(response);
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const normalizedIdentifier = (identifier || '').trim();

    if (!normalizedIdentifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const identifierQueryValue = normalizedIdentifier.includes('@')
      ? normalizedIdentifier.toLowerCase()
      : normalizedIdentifier;

    // Check for user by email OR phone
    const user = await User.findOne({ 
      $or: [
        { email: identifierQueryValue },
        { 'profileDetails.phone': identifierQueryValue }
      ]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Check if user is suspended
      if (user.status === 'Suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended by the administrator.'
        });
      }

      // Check if farmer is approved
      if (user.role === 'Farmer' && !user.isApproved) {
        return res.status(403).json({ 
          message: 'Your account is pending admin approval. You will be able to login once approved.',
          role: user.role,
          isApproved: user.isApproved
        });
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        status: user.status,
        accessToken: generateAccessToken(user._id),
        refreshToken: generateRefreshToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// @desc    Get all farmers pending approval
// @route   GET /api/auth/admin/pending-farmers
// @access  Private (Admin only)
const getPendingFarmers = async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can access this' });
    }

    // Get all farmers pending approval
    const pendingFarmers = await User.find({
      role: 'Farmer',
      isApproved: false
    }).select('-password');

    res.json(pendingFarmers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching pending farmers' });
  }
};

// @desc    Approve a farmer
// @route   POST /api/auth/admin/approve-farmer/:farmerId
// @access  Private (Admin only)
const approveFarmer = async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can approve farmers' });
    }

    const { farmerId } = req.params;

    // Find the farmer
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (farmer.role !== 'Farmer') {
      return res.status(400).json({ message: 'User is not a farmer' });
    }

    // Approve the farmer
    farmer.isApproved = true;
    await farmer.save();

    res.json({
      message: `✅ Farmer ${farmer.name} has been approved. They can now log in.`,
      farmer: {
        _id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        role: farmer.role,
        isApproved: farmer.isApproved
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error approving farmer' });
  }
};

// @desc    Reject a farmer
// @route   POST /api/auth/admin/reject-farmer/:farmerId
// @access  Private (Admin only)
const rejectFarmer = async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.id);
    if (adminUser.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can reject farmers' });
    }

    const { farmerId } = req.params;
    const { reason } = req.body;

    // Find the farmer
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (farmer.role !== 'Farmer') {
      return res.status(400).json({ message: 'User is not a farmer' });
    }

    // Delete the farmer account
    await User.findByIdAndDelete(farmerId);

    res.json({
      message: `❌ Farmer ${farmer.name} has been rejected. Reason sent via email.`,
      rejectionReason: reason || 'No reason provided'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error rejecting farmer' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      
      // Update profileDetails if provided
      if (req.body.profileDetails) {
        user.profileDetails = {
          ...user.profileDetails,
          ...req.body.profileDetails
        };
      }

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profileDetails: updatedUser.profileDetails,
        accessToken: generateAccessToken(updatedUser._id),
        refreshToken: generateRefreshToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @desc    Create admin account (only if no admin exists)
// @route   POST /api/auth/setup-admin
// @access  Public (but only works if no admin exists)
const createAdminSetup = async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
      return res.status(403).json({ message: '❌ Admin account already exists. Cannot create another.' });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: '❌ Email, password, and name are required.' });
    }

    // Check if user with this email exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: '❌ User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'Admin',
      isApproved: true,
      status: 'Active'
    });

    res.status(201).json({
      message: '✅ Admin account created successfully!',
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({ message: 'Server error creating admin account', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getPendingFarmers,
  approveFarmer,
  rejectFarmer,
  updateProfile,
  refreshToken,
  createAdminSetup
};
