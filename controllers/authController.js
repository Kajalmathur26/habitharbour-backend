const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check existing user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert([
        { name, email, password: hashedPassword, preferences: { theme: 'dark', accent: 'violet' } }
      ])
      .select('id, name, email, preferences, created_at')
      .single();

    if (error) throw error;

    const token = generateToken(user.id);
    res.status(201).json({ message: 'Account created successfully', token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password, preferences, avatar_url, phone')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ message: 'Login successful', token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

// Update user profile (extend to avatar_url and phone)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, preferences, avatar_url, phone } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (preferences !== undefined) updates.preferences = preferences;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (phone !== undefined) updates.phone = phone;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upload avatar using Supabase Storage
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file; // multer buffer

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const fileName = `avatars/${userId}-${Date.now()}.${file.mimetype.split('/')[1]}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('planora-media')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('planora-media')
      .getPublicUrl(fileName);

    // Update user record with avatar URL
    await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    res.json({ success: true, data: { avatar_url: publicUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cascade deletes should be handled by FK constraints in DB
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAccount,
};