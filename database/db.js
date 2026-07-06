const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure db directory and file exist
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      logs: [],
      quests: [
        {
          id: "q1",
          title: "Public Transit Commuter",
          description: "Use bus, train, or subway instead of driving today.",
          category: "transport",
          carbonSaved: 4.2, // kg CO2
          points: 150
        },
        {
          id: "q2",
          title: "Plant-Powered Plate",
          description: "Eat entirely plant-based meals today.",
          category: "food",
          carbonSaved: 2.1,
          points: 100
        },
        {
          id: "q3",
          title: "Vampire Power Slayer",
          description: "Unplug 5 unused electronics or chargers today.",
          category: "energy",
          carbonSaved: 0.8,
          points: 50
        },
        {
          id: "q4",
          title: "Zero Waste Hero",
          description: "Avoid single-use plastics and compost food waste today.",
          category: "waste",
          carbonSaved: 1.5,
          points: 80
        },
        {
          id: "q5",
          title: "Cold Wash Only",
          description: "Wash a load of laundry using cold water instead of hot.",
          category: "energy",
          carbonSaved: 1.1,
          points: 60
        },
        {
          id: "q6",
          title: "Pedal Power",
          description: "Walk or cycle for a trip under 3 miles.",
          category: "transport",
          carbonSaved: 2.5,
          points: 120
        }
      ],
      userQuests: [] // track completions: { id, userId, questId, completedAt }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Read database file
function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file:", err);
    return { users: [], logs: [], quests: [], userQuests: [] };
  }
}

// Write to database file
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing to database file:", err);
    return false;
  }
}

// Helper to filter documents based on query object
function matchQuery(doc, query) {
  for (const key in query) {
    if (doc[key] !== query[key]) return false;
  }
  return true;
}

const db = {
  // Find all matching records in collection
  find(collection, query = {}) {
    const data = readDb();
    if (!data[collection]) return [];
    return data[collection].filter(doc => matchQuery(doc, query));
  },

  // Find first matching record
  findOne(collection, query = {}) {
    const data = readDb();
    if (!data[collection]) return null;
    return data[collection].find(doc => matchQuery(doc, query)) || null;
  },

  // Insert a new record
  insert(collection, doc) {
    const data = readDb();
    if (!data[collection]) {
      data[collection] = [];
    }
    
    // Add unique ID if not present
    const newDoc = {
      id: doc.id || Math.random().toString(36).substr(2, 9),
      ...doc,
      createdAt: new Date().toISOString()
    };
    
    data[collection].push(newDoc);
    writeDb(data);
    return newDoc;
  },

  // Update records matching query
  update(collection, query, updateData) {
    const data = readDb();
    if (!data[collection]) return 0;
    
    let updatedCount = 0;
    data[collection] = data[collection].map(doc => {
      if (matchQuery(doc, query)) {
        updatedCount++;
        return {
          ...doc,
          ...updateData,
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    });
    
    if (updatedCount > 0) {
      writeDb(data);
    }
    return updatedCount;
  },

  // Delete records matching query
  delete(collection, query) {
    const data = readDb();
    if (!data[collection]) return 0;
    
    const initialLength = data[collection].length;
    data[collection] = data[collection].filter(doc => !matchQuery(doc, query));
    const deletedCount = initialLength - data[collection].length;
    
    if (deletedCount > 0) {
      writeDb(data);
    }
    return deletedCount;
  }
};

// Seed database immediately on import
initDb();

module.exports = db;
