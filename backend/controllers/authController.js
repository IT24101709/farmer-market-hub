const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
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
      role: userRole
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
      
      // Only provide token if not a farmer awaiting approval
      if (!isFarmerAwaitingApproval) {
        response.token = generateToken(user._id);
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
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
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
        token: generateToken(user._id)
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
      message: 'Farmer approved successfully',
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
      message: 'Farmer rejected and account deleted',
      rejectionReason: reason || 'No reason provided'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error rejecting farmer' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getPendingFarmers,
  approveFarmer,
  rejectFarmer,
};
