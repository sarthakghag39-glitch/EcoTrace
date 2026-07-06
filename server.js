require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ecotrace-super-secret-key-13';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let aiClient = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.error('Failed to initialize AI Client:', err);
  }
}

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

// ---------------- AUTH ENDPOINTS ----------------

// Register User
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if user already exists
  const existingUser = db.findOne('users', { email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Insert user
  const newUser = db.insert('users', {
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    level: 1,
    points: 0,
    streak: 0,
    totalCarbonSaved: 0,
    lastActiveDate: null
  });

  // Generate JWT
  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      level: newUser.level,
      points: newUser.points,
      streak: newUser.streak
    }
  });
});

// Login User
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.findOne('users', { email: email.toLowerCase() });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate JWT
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

  // Update streak if login is consecutive day
  let streak = user.streak;
  const todayStr = new Date().toDateString();
  const lastActiveStr = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;

  if (lastActiveStr && lastActiveStr !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastActiveStr === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1; // reset streak if gap exists
    }
  } else if (!lastActiveStr) {
    streak = 1;
  }

  db.update('users', { id: user.id }, { streak, lastActiveDate: new Date().toISOString() });

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      level: user.level,
      points: user.points + 50, // login bonus point check or logic
      streak
    }
  });
});

// Get User Profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = db.findOne('users', { id: req.user.id });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password, ...userProfile } = user;
  res.json(userProfile);
});


// ---------------- FOOTPRINT ENDPOINTS ----------------

// Calculate and Log Footprint
app.post('/api/footprint/log', authenticateToken, (req, res) => {
  const {
    carDistance, carType, transitDistance, flightHours,
    electricityKwh, gasKwh,
    dietType,
    wasteVolume, recycleRate
  } = req.body;

  // 1. Calculations (Coefficients based on average kg CO2 equivalent)
  // Transport calculations
  let carFactor = 0.18; // Default medium car (Petrol)
  if (carType === 'diesel') carFactor = 0.17;
  else if (carType === 'electric') carFactor = 0.05;
  else if (carType === 'hybrid') carFactor = 0.10;
  
  const transportScore = (Number(carDistance || 0) * carFactor) +
                          (Number(transitDistance || 0) * 0.04) +
                          (Number(flightHours || 0) * 90.0); // 90kg per hour roughly

  // Energy calculations
  const electricityScore = Number(electricityKwh || 0) * 0.38; // 0.38 kg CO2/kWh
  const gasScore = Number(gasKwh || 0) * 0.20; // 0.20 kg CO2/kWh
  const energyScore = electricityScore + gasScore;

  // Diet calculations (scaled weekly)
  let dietDailyFactor = 2.5; // Average meat
  if (dietType === 'heavy-meat') dietDailyFactor = 3.3;
  else if (dietType === 'vegetarian') dietDailyFactor = 1.7;
  else if (dietType === 'vegan') dietDailyFactor = 1.5;
  const dietScore = dietDailyFactor * 7; // Weekly factor representation

  // Waste calculations (scaled weekly)
  // wasteVolume: 0 = low, 1 = medium, 2 = high
  let baseWaste = 2.0; // Medium
  if (wasteVolume === 'low') baseWaste = 1.0;
  else if (wasteVolume === 'high') baseWaste = 4.0;
  
  const recycleFactor = Number(recycleRate || 0) / 100; // 0 to 1
  const wasteScore = baseWaste * 7 * (1 - (recycleFactor * 0.6)); // 60% max reduction for recycling

  // Totals
  const totalCarbon = Number((transportScore + energyScore + dietScore + wasteScore).toFixed(2));

  // Save entry to logs
  const logEntry = db.insert('logs', {
    userId: req.user.id,
    transport: Number(transportScore.toFixed(2)),
    energy: Number(energyScore.toFixed(2)),
    diet: Number(dietScore.toFixed(2)),
    waste: Number(wasteScore.toFixed(2)),
    totalCarbon,
    details: {
      carDistance, carType, transitDistance, flightHours,
      electricityKwh, gasKwh, dietType, wasteVolume, recycleRate
    }
  });

  // Calculate points and reward user
  const user = db.findOne('users', { id: req.user.id });
  const pointsEarned = 100; // 100 XP for calculating
  const newPoints = user.points + pointsEarned;
  
  // Dynamic Level Calculation: level up every 500 points
  const newLevel = Math.floor(newPoints / 500) + 1;
  const leveledUp = newLevel > user.level;

  db.update('users', { id: req.user.id }, {
    points: newPoints,
    level: newLevel
  });

  res.status(201).json({
    message: 'Carbon footprint logged successfully',
    log: logEntry,
    pointsEarned,
    leveledUp,
    newLevel,
    newPoints
  });
});

// Fetch User Logs History
app.get('/api/footprint/history', authenticateToken, (req, res) => {
  const logs = db.find('logs', { userId: req.user.id });
  // Sort logs by createdAt descending
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(logs);
});


// ---------------- QUESTS ENDPOINTS ----------------

// Get Quests with Completion Status
app.get('/api/quests', authenticateToken, (req, res) => {
  const quests = db.find('quests');
  const userCompletions = db.find('userQuests', { userId: req.user.id });
  
  // Find completions done today
  const todayStr = new Date().toDateString();
  const completedTodayQuestIds = userCompletions
    .filter(uc => new Date(uc.createdAt).toDateString() === todayStr)
    .map(uc => uc.questId);

  const formattedQuests = quests.map(q => ({
    ...q,
    completedToday: completedTodayQuestIds.includes(q.id)
  }));

  res.json(formattedQuests);
});

// Complete a Quest
app.post('/api/quests/complete', authenticateToken, (req, res) => {
  const { questId } = req.body;

  if (!questId) {
    return res.status(400).json({ error: 'Quest ID is required' });
  }

  // Check if quest exists
  const quest = db.findOne('quests', { id: questId });
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  // Check if already completed today
  const todayStr = new Date().toDateString();
  const alreadyCompleted = db.find('userQuests', { userId: req.user.id, questId })
    .some(uc => new Date(uc.createdAt).toDateString() === todayStr);

  if (alreadyCompleted) {
    return res.status(400).json({ error: 'Quest already completed today' });
  }

  // Record completion
  db.insert('userQuests', {
    userId: req.user.id,
    questId,
  });

  // Reward points and carbon saved to user
  const user = db.findOne('users', { id: req.user.id });
  const newPoints = user.points + quest.points;
  const newCarbonSaved = (user.totalCarbonSaved || 0) + quest.carbonSaved;
  const newLevel = Math.floor(newPoints / 500) + 1;
  const leveledUp = newLevel > user.level;

  db.update('users', { id: req.user.id }, {
    points: newPoints,
    level: newLevel,
    totalCarbonSaved: Number(newCarbonSaved.toFixed(2))
  });

  res.json({
    message: 'Quest completed successfully!',
    pointsEarned: quest.points,
    carbonSaved: quest.carbonSaved,
    leveledUp,
    newLevel,
    newPoints
  });
});


// ---------------- LEADERBOARD ENDPOINT ----------------

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
  // Get all users
  const users = db.find('users');
  
  // Format user records for leaderboard
  const formattedUsers = users.map(u => ({
    name: u.name,
    level: u.level,
    points: u.points,
    carbonSaved: u.totalCarbonSaved || 0,
    isCurrentUser: false // updated on frontend
  }));

  // Seed mock competitors to make leaderboard feel alive if it's a fresh database
  const mockCompetitors = [
    { name: 'Elena Rostova (Green Leader)', level: 8, points: 3820, carbonSaved: 142.4, isCurrentUser: false },
    { name: 'Sophia Verde', level: 5, points: 2310, carbonSaved: 85.5, isCurrentUser: false },
    { name: 'Marcus Green', level: 4, points: 1750, carbonSaved: 62.1, isCurrentUser: false },
    { name: 'Alex Clay', level: 3, points: 1100, carbonSaved: 35.8, isCurrentUser: false },
  ];

  // Combine
  const allUsers = [...formattedUsers, ...mockCompetitors];

  // Sort by points descending
  allUsers.sort((a, b) => b.points - a.points);

  // Return top 10
  res.json(allUsers.slice(0, 10));
});


// ---------------- AI ECO-COACH ENDPOINT ----------------

app.post('/api/ai/coach', authenticateToken, async (req, res) => {
  try {
    // Get user's latest footprint
    const logs = db.find('logs', { userId: req.user.id });
    if (!logs || logs.length === 0) {
      return res.json({ advice: "Hi there! I'm your AI Eco-Coach. I need you to calculate your footprint first so I can give you personalized advice." });
    }
    
    // Sort and get the most recent log
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestLog = logs[0];
    
    // Check if we have a valid API client
    if (!aiClient) {
      console.log("No valid Gemini API key found, using fallback AI simulated response.");
      return res.json({ advice: `[Simulated AI Fallback]\nGreat job tracking! Your total footprint is ${latestLog.totalCarbon} kg. Since your highest emissions come from ${Math.max(latestLog.transport, latestLog.energy, latestLog.diet) === latestLog.transport ? 'Transport' : 'your daily habits'}, try walking short distances or turning off unused electronics to lower your impact!` });
    }

    // Prepare prompt
    const prompt = `You are a friendly, encouraging AI Eco-Coach. A user just logged their carbon footprint.
Transport emissions: ${latestLog.transport} kg CO2
Energy emissions: ${latestLog.energy} kg CO2
Diet emissions: ${latestLog.diet} kg CO2
Waste emissions: ${latestLog.waste} kg CO2
Total: ${latestLog.totalCarbon} kg CO2

Based on this specific data, give 2 short, highly personalized, and actionable tips to help them reduce their footprint. Do not use markdown headers, just return a short friendly message.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    res.json({ advice: response.text });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.json({ advice: "I'm having trouble connecting to my AI brain right now. Please keep up your great work and try again later!" });
  }
});


// Serve SPA Client Page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`EcoTrace server running on http://localhost:${PORT}`);
});
