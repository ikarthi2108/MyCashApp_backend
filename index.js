const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User Model
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Goal Model
const GoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  target: { type: Number, required: true },
  saved: { type: Number, default: 0 },
  startDate: { type: String, required: true },
  targetDate: { type: String, required: true }
}, { timestamps: true });

const Goal = mongoose.model('Goal', GoalSchema);

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({ 
      message: 'Account created successfully',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({ 
      message: 'Login successful',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/goals', async (req, res) => {
  try {
    const { userId } = req.query;
    const goals = await Goal.find({ userId });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching goals', error: error.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const goal = new Goal(req.body);
    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: 'Error creating goal', error: error.message });
  }
});

app.patch('/api/goals/:id', async (req, res) => {
  try {
    const { amountToAdd } = req.body;
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    goal.saved += amountToAdd;
    await goal.save();
    
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: 'Error updating goal', error: error.message });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    await Goal.deleteOne({ _id: req.params.id });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting goal', error: error.message });
  }
});


// Budget Model
const BudgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    month: { type: String, required: true }, // Format: "YYYY-MM"
  }, { timestamps: true });
  
  const Budget = mongoose.model('Budget', BudgetSchema);
  
  // Budget Routes
  app.get('/api/budgets', async (req, res) => {
    try {
      const { userId } = req.query;
      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const budgets = await Budget.find({ userId, month: currentMonth });
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching budgets', error: error.message });
    }
  });
  
  app.post('/api/budgets', async (req, res) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const budget = new Budget({ ...req.body, month: currentMonth });
      await budget.save();
      res.status(201).json(budget);
    } catch (error) {
      res.status(500).json({ message: 'Error creating budget', error: error.message });
    }
  });
  
  app.patch('/api/budgets/:id', async (req, res) => {
    try {
      const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!budget) {
        return res.status(404).json({ message: 'Budget not found' });
      }
      res.json(budget);
    } catch (error) {
      res.status(500).json({ message: 'Error updating budget', error: error.message });
    }
  });
  
  app.post('/api/budgets/reset', async (req, res) => {
    try {
      const { userId } = req.body;
      const currentMonth = new Date().toISOString().slice(0, 7);
      await Budget.deleteMany({ userId, month: currentMonth });
      res.json({ message: 'Budgets reset successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting budgets', error: error.message });
    }
  });
  

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));