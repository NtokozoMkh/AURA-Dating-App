import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { UserProfile, MatchProfile, ChatMessage, Match, UserAccount, PaymentMethod } from "./src/types";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel, doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

const httpServer = createHttpServer(app);
const wss = new WebSocketServer({ noServer: true });
let viteServer: any = null;

// Manually handle httpServer upgrade events for the '/ws' path to avoid conflicts with Vite or proxy upgrade handlers
httpServer.on("upgrade", (request, socket, head) => {
  try {
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (viteServer && viteServer.ws) {
      // Forward HMR socket connection requests to Vite
      viteServer.ws.handleUpgrade(request, socket, head);
    }
  } catch (err) {
    console.error("Error routing upgrade in httpServer:", err);
  }
});

// Map matchId to a Set of WebSocket connections
const matchRooms = new Map<string, Set<WebSocket>>();

function broadcastToMatch(matchId: string, payload: any) {
  const room = matchRooms.get(matchId);
  if (room) {
    const data = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}

// Set up JSON parsing with a limit for video uploads (base64)
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini SDK
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Database file path
const DB_FILE = path.join(process.cwd(), "db-store.json");

// Default Mock Match Profiles
const DEFAULT_MATCH_PROFILES: MatchProfile[] = [
  {
    id: "chloe",
    name: "Chloe Chen",
    age: 24,
    gender: "female",
    occupation: "Creative Writer & Book Cover Designer",
    bio: "Obsessed with cozy indie games, custom typewriter fonts, and rainy Sundays at coffee shops. Looking for someone who doesn't mind listening to endless analytical deep-dives about movie plots. ☕📖",
    interests: ["Reading", "Indie Games", "Coffee", "Cinema", "Design"],
    mbti: "INFJ",
    personalityAnswers: {
      social: -3,       // Introvert
      creative: 4,      // Highly creative
      planning: 3,      // Organized
      energy: -2,       // Calm
      convention: -3,   // Unconventional
    },
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  },
  {
    id: "marcus",
    name: "Marcus Vance",
    age: 27,
    gender: "male",
    occupation: "Adventure Photographer",
    bio: "Always either editing on a laptop or packing a rucksack. If there is a hiking trail with a panoramic view, I am there. Love dog parks, local vinyl records, and cooking experimental pasta dishes.",
    interests: ["Photography", "Hiking", "Vinyl", "Cooking", "Outdoors"],
    mbti: "ENFP",
    personalityAnswers: {
      social: 4,        // Extrovert
      creative: 3,      // Creative
      planning: -2,     // Spontaneous
      energy: 3,        // Energetic
      convention: -2,   // Unconventional
    },
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  },
  {
    id: "aisha",
    name: "Aisha Patel",
    age: 26,
    gender: "female",
    occupation: "AI Research Engineer",
    bio: "Coding by day, chess & bouldering by night. Big fan of hard sci-fi, cyberpunk worldbuilding, and electronic music. Let's challenge each other to a game or share favorite synth tracks.",
    interests: ["Technology", "Chess", "Bouldering", "Music", "Reading"],
    mbti: "INTJ",
    personalityAnswers: {
      social: -4,       // Introvert
      creative: 2,      // Moderately creative
      planning: 4,      // Highly planned
      energy: 1,        // Slightly active
      convention: -4,   // Highly unconventional
    },
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  },
  {
    id: "liam",
    name: "Liam O'Connor",
    age: 25,
    gender: "male",
    occupation: "Artisanal Pastry Chef",
    bio: "Sugar, butter, flour, and absolute chaos. I run on caffeine, retro 80s pop, and the pursuit of the perfect sourdough starter. Tell me your favorite dessert and let's see if I can bake it for you.",
    interests: ["Baking", "Music", "Foodie", "Pop Culture", "Coffee"],
    mbti: "ESFP",
    personalityAnswers: {
      social: 3,        // Extrovert
      creative: 2,      // Creative
      planning: -3,     // Very spontaneous
      energy: 4,        // High energy
      convention: 1,    // Slightly conventional
    },
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  },
  {
    id: "yuki",
    name: "Yuki Tanaka",
    age: 25,
    gender: "female",
    occupation: "Observational Astronomer",
    bio: "Professional star-gazer and amateur modular synthesizer player. I collect obscure board games and watch 90s anime. Let's find a dark spot away from city lights and talk about cosmic mysteries.",
    interests: ["Astronomy", "Music", "Board Games", "Anime", "Nature"],
    mbti: "INTP",
    personalityAnswers: {
      social: -3,
      creative: 3,
      planning: -1,
      energy: -3,
      convention: -4,
    },
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  },
  {
    id: "elena",
    name: "Elena Rostova",
    age: 28,
    gender: "female",
    occupation: "Contemporary Dancer",
    bio: "Movement is my language. When I am not in the studio, I am exploring local street food or booking a last-minute flight somewhere. Life is too short to stick to the plan. Let's go salsa dancing! 💃",
    interests: ["Dancing", "Fitness", "Travel", "Foodie", "Arts"],
    mbti: "ESTP",
    personalityAnswers: {
      social: 4,
      creative: 2,
      planning: -4,
      energy: 4,
      convention: -1,
    },
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  },
  {
    id: "daniel",
    name: "Daniel Kim",
    age: 29,
    gender: "male",
    occupation: "Architectural Designer",
    bio: "Appreciates clean lines, brutalist concrete, and exceptionally strong espresso. I sketch city landmarks, read urban design theory, and love gallery hopping. Looking for someone to share curated museum afternoons.",
    interests: ["Design", "Art", "Architecture", "Coffee", "Museums"],
    mbti: "ISTJ",
    personalityAnswers: {
      social: -2,
      creative: 3,
      planning: 4,
      energy: -2,
      convention: 2,
    },
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80",
    isVerified: true
  }
];

// In-memory / Filesystem database helper
interface DatabaseSchema {
  accounts?: { [username: string]: UserAccount };
  userProfile: UserProfile;
  swipes: { [profileId: string]: "left" | "right" };
  matches: Match[];
  messages: ChatMessage[];
}

const DEFAULT_USER_PROFILE: UserProfile = {
  id: "user",
  name: "Alex",
  age: 25,
  gender: "Non-binary",
  lookingFor: "everyone",
  bio: "Curious spirit exploring the intersection of art, technology, and good food. Love deep conversations about nothing, early morning walks, and vinyl records.",
  occupation: "Product Designer",
  interests: ["Design", "Music", "Coffee", "Vinyl", "Reading"],
  mbti: "ENFP",
  personalityAnswers: {
    social: 2,       // slightly extravert
    creative: 3,     // creative
    planning: -2,    // slightly spontaneous
    energy: 1,       // balanced
    convention: -2,  // slightly unconventional
  },
  isVerified: false,
  verificationStatus: "unverified",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  isPremium: false,
  subscriptionPlan: "none",
  subscriptionExpiresAt: 0,
  blockedUserIds: [],
  reportedUserIds: [],
  pushNotificationsEnabled: true
};

function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.accounts) {
        parsed.accounts = {};
      }
      return parsed;
    }
  } catch (error) {
    console.error("Error reading database file, using defaults:", error);
  }
  return {
    accounts: {},
    userProfile: DEFAULT_USER_PROFILE,
    swipes: {},
    matches: [],
    messages: []
  };
}

// Safely load Firebase config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Set log level to 'error' to silence standard Firestore SDK idle connection cancellation warnings in Node.js
setLogLevel("error");

const firebaseApp = initializeApp(firebaseConfig);
const dbFirestore = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

async function syncFromFirestore(db: DatabaseSchema) {
  try {
    console.log("Syncing database from Firestore...");
    const accountsCol = collection(dbFirestore, "accounts");
    const snapshot = await getDocs(accountsCol);
    if (!db.accounts) {
      db.accounts = {};
    }
    snapshot.forEach((doc) => {
      const username = doc.id;
      const data = doc.data() as UserAccount;
      if (db.accounts) {
        db.accounts[username] = data;
      }
    });
    console.log(`Successfully synced ${snapshot.size} accounts from Firestore.`);
  } catch (err) {
    console.error("Error syncing from Firestore:", err);
  }
}

async function syncUserToFirestore(username: string, account: UserAccount) {
  try {
    const docRef = doc(dbFirestore, "accounts", username);
    await setDoc(docRef, account);
  } catch (err) {
    console.error(`Error saving account for ${username} to Firestore:`, err);
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    if (db.accounts) {
      for (const username of Object.keys(db.accounts)) {
        syncUserToFirestore(username, db.accounts[username]);
      }
    }
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

// Scoped User context helper
function getAccountContext(req: any, db: DatabaseSchema) {
  let token: string | undefined;
  if (typeof req === "string") {
    token = req;
  } else if (req && req.headers) {
    token = req.headers["x-user-token"] as string;
  }

  if (token && token.startsWith("token_")) {
    const username = token.substring(6);
    if (!db.accounts) {
      db.accounts = {};
    }
    if (db.accounts[username]) {
      return db.accounts[username];
    }
  }

  // Fallback to legacy default account for compatibility
  return {
    id: "user",
    username: "alex",
    passwordHash: "",
    profile: db.userProfile,
    swipes: db.swipes,
    matches: db.matches,
    messages: db.messages
  };
}

// Scoped User saver helper
function saveAccountContext(req: any, context: any, db: DatabaseSchema) {
  let token: string | undefined;
  if (typeof req === "string") {
    token = req;
  } else if (req && req.headers) {
    token = req.headers["x-user-token"] as string;
  }

  if (token && token.startsWith("token_")) {
    const username = token.substring(6);
    if (db.accounts && db.accounts[username]) {
      db.accounts[username].profile = context.profile;
      db.accounts[username].swipes = context.swipes;
      db.accounts[username].matches = context.matches;
      db.accounts[username].messages = context.messages;
      writeDb(db);
      return;
    }
  }

  db.userProfile = context.profile;
  db.swipes = context.swipes;
  db.matches = context.matches;
  db.messages = context.messages;
  writeDb(db);
}

// Ensure database file exists on startup
const currentDb = readDb();
writeDb(currentDb);

// Sync from Firestore on startup
syncFromFirestore(currentDb).then(() => {
  writeDb(currentDb);
});

// API REST ENDPOINTS

// Registration endpoint
app.post("/api/register", (req, res) => {
  const { username, password, name, age, gender, lookingFor, bio, occupation, interests, mbti, personalityAnswers } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "Username, password and name are required." });
  }

  const db = readDb();
  if (!db.accounts) {
    db.accounts = {};
  }

  const lowercaseUsername = username.toLowerCase().trim();
  if (db.accounts[lowercaseUsername]) {
    return res.status(400).json({ error: "Username already exists. Please choose a different one." });
  }

  const newProfile: UserProfile = {
    id: `user_${lowercaseUsername}_${Date.now()}`,
    name,
    age: Number(age) || 25,
    gender: gender || "Non-binary",
    lookingFor: lookingFor || "everyone",
    bio: bio || "Exploring connections on Aura.",
    occupation: occupation || "Professional",
    interests: Array.isArray(interests) ? interests : ["Coffee", "Music"],
    mbti: mbti || "ENFP",
    personalityAnswers: personalityAnswers || {
      social: 0,
      creative: 0,
      planning: 0,
      energy: 0,
      convention: 0,
    },
    isVerified: false,
    verificationStatus: "unverified",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    isPremium: false,
    subscriptionPlan: "none",
    subscriptionExpiresAt: 0,
    blockedUserIds: [],
    reportedUserIds: [],
    pushNotificationsEnabled: true,
  };

  const newAccount: UserAccount = {
    id: `acc_${lowercaseUsername}`,
    username: lowercaseUsername,
    passwordHash: password,
    profile: newProfile,
    swipes: {},
    matches: [],
    messages: [],
  };

  db.accounts[lowercaseUsername] = newAccount;
  writeDb(db);

  res.json({
    status: "ok",
    token: `token_${lowercaseUsername}`,
    profile: newProfile
  });
});

// Sign-in endpoint
app.post("/api/signin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const db = readDb();
  const lowercaseUsername = username.toLowerCase().trim();
  const account = db.accounts ? db.accounts[lowercaseUsername] : null;

  if (!account || account.passwordHash !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.json({
    status: "ok",
    token: `token_${lowercaseUsername}`,
    profile: account.profile
  });
});

// 1. Get current user profile
app.get("/api/profile", (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  res.json(context.profile);
});

// 2. Update user profile
app.post("/api/profile", (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  context.profile = { ...context.profile, ...req.body };
  saveAccountContext(req, context, db);
  res.json(context.profile);
});

// 2b. Upgrade user subscription
app.post("/api/subscription/upgrade", (req, res) => {
  const { plan } = req.body;
  if (!plan || !["none", "gold", "infinite"].includes(plan)) {
    return res.status(400).json({ error: "Invalid subscription plan selected" });
  }

  const db = readDb();
  const context = getAccountContext(req, db);

  // Require at least one payment method for paid upgrades
  if (plan !== "none") {
    const paymentMethods = context.profile.paymentMethods || [];
    if (paymentMethods.length === 0) {
      return res.status(400).json({ error: "Please add a payment method before upgrading." });
    }
  }

  context.profile.isPremium = plan !== "none";
  context.profile.subscriptionPlan = plan;
  context.profile.subscriptionExpiresAt = plan !== "none" ? Date.now() + 30 * 24 * 60 * 60 * 1000 : 0; // 30 days
  
  if (plan === "infinite") {
    context.profile.isVerified = true;
    context.profile.verificationStatus = "verified";
  }
  
  saveAccountContext(req, context, db);
  res.json(context.profile);
});

// --- SUBSCRIPTION PAYMENT METHODS API ---

// 1. Get payment methods
app.get("/api/payment-methods", (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  res.json(context.profile.paymentMethods || []);
});

// 2. Add payment method
app.post("/api/payment-methods", (req, res) => {
  const { type, cardBrand, last4, expiry, email } = req.body;
  if (!type || !["card", "paypal", "gpay"].includes(type)) {
    return res.status(400).json({ error: "Invalid payment method type" });
  }

  const db = readDb();
  const context = getAccountContext(req, db);

  if (!context.profile.paymentMethods) {
    context.profile.paymentMethods = [];
  }

  // If this is the first payment method, make it default
  const isDefault = context.profile.paymentMethods.length === 0;

  const newMethod: PaymentMethod = {
    id: `pm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    isDefault,
    cardBrand,
    last4,
    expiry,
    email,
    createdAt: Date.now()
  };

  context.profile.paymentMethods.push(newMethod);
  saveAccountContext(req, context, db);
  res.json(context.profile.paymentMethods);
});

// 3. Set default payment method
app.post("/api/payment-methods/default", (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Payment method ID is required" });
  }

  const db = readDb();
  const context = getAccountContext(req, db);
  const methods = context.profile.paymentMethods || [];

  const updatedMethods = methods.map(pm => ({
    ...pm,
    isDefault: pm.id === id
  }));

  context.profile.paymentMethods = updatedMethods;
  saveAccountContext(req, context, db);
  res.json(updatedMethods);
});

// 4. Delete payment method
app.delete("/api/payment-methods/:id", (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Payment method ID is required" });
  }

  const db = readDb();
  const context = getAccountContext(req, db);
  const methods = context.profile.paymentMethods || [];

  let updatedMethods = methods.filter(pm => pm.id !== id);

  // Ensure there's still a default if methods remain
  if (updatedMethods.length > 0 && !updatedMethods.some(pm => pm.isDefault)) {
    updatedMethods[0].isDefault = true;
  }

  context.profile.paymentMethods = updatedMethods;
  saveAccountContext(req, context, db);
  res.json(updatedMethods);
});

// 3. Handle video verification
app.post("/api/verify-video", (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  const { videoData } = req.body; // base64 video

  // Mark pending
  context.profile.verificationStatus = "pending";
  context.profile.verificationVideoUrl = videoData ? "data:video/webm;base64,...truncated" : undefined;
  saveAccountContext(req, context, db);

  // Simulate AI facial-symmetry scanning and landmark verification after a tiny delay
  setTimeout(() => {
    const updatedDb = readDb();
    const updatedContext = getAccountContext(req, updatedDb);
    updatedContext.profile.verificationStatus = "verified";
    updatedContext.profile.isVerified = true;
    saveAccountContext(req, updatedContext, updatedDb);
    console.log("User verification complete: SUCCESS");
  }, 3500);

  res.json({ status: "pending", message: "Video uploaded successfully. AI Verification process started." });
});

// 4. Reset database (for clean test flow)
app.post("/api/reset", (req, res) => {
  const newDb: DatabaseSchema = {
    userProfile: DEFAULT_USER_PROFILE,
    swipes: {},
    matches: [],
    messages: []
  };
  writeDb(newDb);
  res.json({ status: "ok", message: "Database reset to defaults" });
});

// Helper: Calculate personality match score based on Euclidean distance
function calculateMatchScore(userAnswers: { [key: string]: number }, matchAnswers: { [key: string]: number }) {
  const keys = ["social", "creative", "planning", "energy", "convention"];
  let sumSquaredDiff = 0;
  keys.forEach((key) => {
    const u = userAnswers[key] || 0;
    const m = matchAnswers[key] || 0;
    sumSquaredDiff += Math.pow(u - m, 2);
  });
  // Max distance is with 5 keys, each -5 to 5 (max distance is 10)
  // Max squared diff = 5 * (10^2) = 500
  const distance = Math.sqrt(sumSquaredDiff);
  const maxDistance = Math.sqrt(500);
  const percentage = 100 - (distance / maxDistance) * 50; // clamp so min score is 50% for standard profiles
  return Math.round(Math.min(99, Math.max(65, percentage)));
}

// 5. Get available swipe cards (not swiped yet)
app.get("/api/cards", (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  const user = context.profile;
  const swipes = context.swipes;

  // Filter out already swiped profiles, and blocked/reported profiles
  const blockedIds = user.blockedUserIds || [];
  const reportedIds = user.reportedUserIds || [];
  const availableProfiles = DEFAULT_MATCH_PROFILES.filter(
    (profile) => !swipes[profile.id] && !blockedIds.includes(profile.id) && !reportedIds.includes(profile.id)
  );

  // Map with compatibility score
  const cards = availableProfiles.map((profile) => {
    const compatibilityScore = calculateMatchScore(user.personalityAnswers, profile.personalityAnswers);
    return {
      ...profile,
      compatibilityScore,
    };
  });

  // Sort by highest compatibility score first
  cards.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  res.json(cards);
});

// 6. Swipe action (left or right)
app.post("/api/swipe", async (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  const { profileId, direction } = req.body;

  if (!profileId || !direction) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  context.swipes[profileId] = direction;

  let isMatch = false;
  let matchObj: Match | null = null;

  if (direction === "right") {
    // 70% chance of matching to simulate active dating pool
    const matchProfile = DEFAULT_MATCH_PROFILES.find((p) => p.id === profileId);
    if (matchProfile) {
      isMatch = true;
      const score = calculateMatchScore(context.profile.personalityAnswers, matchProfile.personalityAnswers);
      
      const newMatchProfile = {
        ...matchProfile,
        compatibilityScore: score
      };

      matchObj = {
        id: `match_${profileId}_${Date.now()}`,
        profile: newMatchProfile,
        matchedAt: Date.now(),
      };

      context.matches.push(matchObj);
    }
  }

  saveAccountContext(req, context, db);
  res.json({ status: "ok", isMatch, match: matchObj });
});

// 7. Get user's matches
app.get("/api/matches", (req, res) => {
  const db = readDb();
  const context = getAccountContext(req, db);
  
  // Clean disappearing messages older than 24h (48h for premium)
  const now = Date.now();
  const isPremium = context.profile.isPremium;
  const EXPIRY_MS = isPremium ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  
  // Filter out stale messages in database
  const activeMessages = context.messages.filter(msg => now - msg.createdAt < EXPIRY_MS);
  if (activeMessages.length !== context.messages.length) {
    context.messages = activeMessages;
    saveAccountContext(req, context, db);
  }

  const blockedIds = context.profile.blockedUserIds || [];
  const reportedIds = context.profile.reportedUserIds || [];
  const unblockedMatches = context.matches.filter(
    (match) => !blockedIds.includes(match.profile.id) && !reportedIds.includes(match.profile.id)
  );

  // Map matches with their latest message
  const matchesWithMessages = unblockedMatches.map((match) => {
    const matchMsgs = context.messages.filter((m) => m.matchId === match.id);
    matchMsgs.sort((a, b) => b.createdAt - a.createdAt); // newest first
    return {
      ...match,
      lastMessage: matchMsgs[0] || null,
    };
  });

  // Sort matches by last message time or match time
  matchesWithMessages.sort((a, b) => {
    const timeA = a.lastMessage ? a.lastMessage.createdAt : a.matchedAt;
    const timeB = b.lastMessage ? b.lastMessage.createdAt : b.matchedAt;
    return timeB - timeA;
  });

  res.json(matchesWithMessages);
});

// --- BLOCK / REPORT USER API ---

// 1. Block a user
app.post("/api/block", (req, res) => {
  const { profileId } = req.body;
  if (!profileId) {
    return res.status(400).json({ error: "Profile ID is required" });
  }

  const db = readDb();
  const context = getAccountContext(req, db);

  if (!context.profile.blockedUserIds) {
    context.profile.blockedUserIds = [];
  }

  if (!context.profile.blockedUserIds.includes(profileId)) {
    context.profile.blockedUserIds.push(profileId);
  }

  // Save as swiped left to prevent rediscovering
  context.swipes[profileId] = "left";

  // Remove matching connections
  context.matches = context.matches.filter(m => m.profile.id !== profileId && m.id !== profileId);

  // Remove corresponding messages
  context.messages = context.messages.filter(msg => msg.matchId !== profileId && !msg.matchId.startsWith(`match_${profileId}_`));

  saveAccountContext(req, context, db);
  res.json(context.profile);
});

// 2. Report a user
app.post("/api/report", (req, res) => {
  const { profileId, reason } = req.body;
  if (!profileId) {
    return res.status(400).json({ error: "Profile ID is required" });
  }

  const db = readDb();
  const context = getAccountContext(req, db);

  if (!context.profile.reportedUserIds) {
    context.profile.reportedUserIds = [];
  }

  if (!context.profile.reportedUserIds.includes(profileId)) {
    context.profile.reportedUserIds.push(profileId);
  }

  // Auto block reported users
  if (!context.profile.blockedUserIds) {
    context.profile.blockedUserIds = [];
  }
  if (!context.profile.blockedUserIds.includes(profileId)) {
    context.profile.blockedUserIds.push(profileId);
  }

  context.swipes[profileId] = "left";
  context.matches = context.matches.filter(m => m.profile.id !== profileId && m.id !== profileId);
  context.messages = context.messages.filter(msg => msg.matchId !== profileId && !msg.matchId.startsWith(`match_${profileId}_`));

  saveAccountContext(req, context, db);
  res.json(context.profile);
});

// 8. Generate Gemini-powered detailed compatibility report
app.get("/api/compatibility/:matchId", async (req, res) => {
  const { matchId } = req.params;
  const db = readDb();
  const context = getAccountContext(req, db);
  
  // Find match in the database matches
  const match = context.matches.find(m => m.id === matchId || m.profile.id === matchId);
  
  let target: MatchProfile | undefined;
  if (match) {
    target = match.profile;
  } else {
    // If not a matched profile, allow viewing from pre-swiped profiles in the discover deck
    target = DEFAULT_MATCH_PROFILES.find(p => p.id === matchId);
  }

  if (!target) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const user = context.profile;

  // Return cached report if already exists
  if (target.compatibilityReport) {
    const score = target.compatibilityScore || calculateMatchScore(user.personalityAnswers, target.personalityAnswers);
    return res.json({
      score,
      report: target.compatibilityReport,
      icebreakers: [
        `Hey ${target.name}! I noticed we both love ${target.interests[0] || "coffee"}. What is your favorite spot in town?`,
        `Your bio about "${target.bio.slice(0, 30)}..." really caught my eye. Tell me more!`,
        `According to our Aura match, we have a ${score}% personality similarity. Let's see if we live up to the algorithm!`
      ]
    });
  }

  if (!ai) {
    // Elegant fallback if no API key is set
    const mockReport = `Since you are both drawn to creative outlets and sharing high-quality moments, your connection with ${target.name} is bound to be sparks-flying! You share an immense appreciation for ${user.interests.filter(i => target.interests.includes(i)).join(" and ") || "creative discovery"}. Your Myers-Briggs types (${user.mbti} and ${target.mbti}) indicate a high level of mental synergy. ${target.name} appreciates your design-thinking while you will appreciate her deep storytelling sensibilities. Get a coffee together and you won't run out of things to talk about!`;
    
    // Cache it
    target.compatibilityReport = mockReport;
    if (match) {
      saveAccountContext(req, context, db);
    }
    
    const score = target.compatibilityScore || calculateMatchScore(user.personalityAnswers, target.personalityAnswers);
    return res.json({
      score,
      report: mockReport,
      icebreakers: [
        `Hey ${target.name}! I noticed we both love ${target.interests[0] || "coffee"}. What is your favorite spot in town?`,
        `Your bio about "${target.bio.slice(0, 30)}..." really caught my eye. Tell me more!`,
        `According to our Aura match, we have a ${score}% personality similarity. Let's see if we live up to the algorithm!`
      ]
    });
  }

  try {
    const prompt = `
      You are an expert dating psychologist, astrologer, and MBTI specialist for a dating app called "Aura".
      Analyze the personality compatibility between:
      User:
      - Name: ${user.name}
      - Occupation: ${user.occupation}
      - Bio: ${user.bio}
      - MBTI: ${user.mbti}
      - Interests: ${user.interests.join(", ")}
      
      Match:
      - Name: ${target.name}
      - Occupation: ${target.occupation}
      - Bio: ${target.bio}
      - MBTI: ${target.mbti}
      - Interests: ${target.interests.join(", ")}
      
      Write a beautiful, highly personalized, and empathetic compatibility report.
      Provide:
      1. A compatibility percentage (85-98%).
      2. A 2-paragraph cohesive analysis highlighting why they fit well, their conversational synergy, and a potential fun date activity.
      3. Three highly specific, creative, and personalized icebreakers or "first message starters" based on their shared traits or hobbies.
      
      Output ONLY valid JSON matching this schema:
      {
        "score": number,
        "analysis": "string containing 2 paragraphs",
        "icebreakers": ["string", "string", "string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            analysis: { type: Type.STRING },
            icebreakers: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["score", "analysis", "icebreakers"]
        }
      }
    });

    const resultText = response.text || "";
    const parsed = JSON.parse(resultText);

    // Save report in db to cache it
    target.compatibilityReport = parsed.analysis;
    if (match) {
      saveAccountContext(req, context, db);
    }

    res.json({
      score: parsed.score || target.compatibilityScore || calculateMatchScore(user.personalityAnswers, target.personalityAnswers),
      report: parsed.analysis,
      icebreakers: parsed.icebreakers
    });

  } catch (err) {
    console.error("Gemini compatibility generation error:", err);
    // Fallback on error
    const score = target.compatibilityScore || calculateMatchScore(user.personalityAnswers, target.personalityAnswers);
    const fallbackReport = `You have an incredible synergy of ${score}%. Your alignment on creative endeavors, design appreciation, and shared social paces means you will find a natural rythm easily.`;
    res.json({
      score,
      report: fallbackReport,
      icebreakers: [
        `Hey ${target.name}! What is your absolute favorite hobby on a free Sunday?`,
        `Let's grab a coffee and talk about Myers-Briggs types!`
      ]
    });
  }
});

// 9. Get chat messages for a specific match (Automatically filters chats older than 24h/48h)
app.get("/api/chat/:matchId", (req, res) => {
  const { matchId } = req.params;
  const db = readDb();
  const context = getAccountContext(req, db);

  const now = Date.now();
  const isPremium = context.profile.isPremium;
  const EXPIRY_MS = isPremium ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  // Filter messages for this match that are NOT expired
  const matchMsgs = context.messages.filter(
    (msg) => msg.matchId === matchId && now - msg.createdAt < EXPIRY_MS
  );

  // Map messages to include exact time remaining in milliseconds
  const msgsWithExpiry = matchMsgs.map((msg) => {
    const elapsed = now - msg.createdAt;
    const timeLeftMs = Math.max(0, EXPIRY_MS - elapsed);
    return {
      ...msg,
      timeLeftMs,
    };
  });

  // Sort oldest first for chat flow
  msgsWithExpiry.sort((a, b) => a.createdAt - b.createdAt);

  res.json(msgsWithExpiry);
});

// 10. Send a message to a match and trigger intelligent AI persona reply
app.post("/api/chat/:matchId", async (req, res) => {
  const { matchId } = req.params;
  const { text, mediaUrl, mediaType, voiceDuration } = req.body;
  const db = readDb();
  const context = getAccountContext(req, db);

  if ((!text || !text.trim()) && !mediaUrl) {
    return res.status(400).json({ error: "Message text or media is required" });
  }

  const match = context.matches.find((m) => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: "Match session not found" });
  }

  const userMsg: ChatMessage = {
    id: `msg_user_${Date.now()}`,
    matchId,
    senderId: "user",
    text: (text || "").trim(),
    createdAt: Date.now(),
    mediaUrl,
    mediaType,
    voiceDuration,
  };

  context.messages.push(userMsg);
  saveAccountContext(req, context, db);

  // Broadcast user message to active websockets
  broadcastToMatch(matchId, { type: "message", message: userMsg });

  // Trigger typing indicators over websockets
  broadcastToMatch(matchId, { type: "typing", isTyping: true, senderId: match.profile.id });

  // Trigger simulated typing and intelligent AI response from the match profile!
  const triggerAiResponse = async () => {
    const updatedDb = readDb();
    const updatedContext = getAccountContext(req, updatedDb);
    const updatedMatch = updatedContext.matches.find((m) => m.id === matchId);
    if (!updatedMatch) return;
    const target = updatedMatch.profile;
    const user = updatedContext.profile;

    // Get the conversation context for this match
    const matchMsgs = updatedContext.messages.filter((m) => m.matchId === matchId);
    matchMsgs.sort((a, b) => a.createdAt - b.createdAt);

    // Take the last 6 messages as context for Gemini
    const lastMsgs = matchMsgs.slice(-6);
    const chatHistoryContext = lastMsgs
      .map((m) => {
        let msgDesc = m.text || '';
        if (m.mediaType === 'image') {
          msgDesc += ` [Sent a Photo: ${m.text || 'Aesthetic lifestyle picture'}]`;
        } else if (m.mediaType === 'audio') {
          msgDesc += ` [Sent a Voice Note: ${m.text || 'Speaking with a warm tone'} (${m.voiceDuration || 5}s)]`;
        }
        return `${m.senderId === "user" ? "User" : target.name}: ${msgDesc}`;
      })
      .join("\n");

    let responseText = "";

    if (ai) {
      try {
        const aiPrompt = `
          You are ${target.name}, a ${target.age}-year-old ${target.occupation} with Myers-Briggs profile ${target.mbti}.
          Your bio: "${target.bio}". Your interests are: ${target.interests.join(", ")}.
          
          You are talking to ${user.name}, who is a ${user.occupation} (Bio: "${user.bio}").
          
          Here is your conversation history so far:
          ${chatHistoryContext}
          
          If the user's latest message is a photo (Sent a Photo) or a voice note (Sent a Voice Note), make sure you react to it in character (e.g. praise their voice, comment on the photo vibe, etc.).
          Write your next response message. Keep it realistic, short, engaging, and in character. 
          Use standard messaging language, lowercases, or emoji naturally as fits your personality.
          Do NOT sound like an AI assistant. Speak directly as ${target.name}. Limit response to 1-2 sentences.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: aiPrompt,
          config: {
            temperature: 0.85,
          }
        });

        responseText = response.text?.trim() || `Wow! That sounds really cool. Tell me more!`;
      } catch (err) {
        console.error("Error generating match response:", err);
        responseText = `Oh that's awesome! I would love to hear more about that. 😊`;
      }
    } else {
      // Offline fallback
      let responses = [
        `That's so interesting! We should definitely chat more about this.`,
        `Oh wow! I totally agree with that. What do you think of coffee shops? ☕`,
        `Haha love that! Let's definitely do something fun soon.`,
        `Nice! Tell me more about what you do as a ${user.occupation}.`,
        `I am honestly so happy we matched. Aura's algorithm actually worked for once! 😊`
      ];
      const lastMsg = lastMsgs[lastMsgs.length - 1];
      if (lastMsg && lastMsg.senderId === 'user') {
        if (lastMsg.mediaType === 'image') {
          responses = [
            `Oh my gosh, I love this picture! You look/this looks amazing. 😍`,
            `Wow, what a gorgeous view/shot! Where was this taken?`,
            `This photo is so aesthetic, I love your vibe! ✨`
          ];
        } else if (lastMsg.mediaType === 'audio') {
          responses = [
            `Omg, your voice is so soothing! I could listen to you talk all day. 🎙️`,
            `Haha I love hearing your voice, it makes this feel so much more real!`,
            `Aw that voice note was so sweet! What are you up to right now?`
          ];
        }
      }
      responseText = responses[Math.floor(Math.random() * responses.length)];
    }

    // Save AI match reply
    const finalDb = readDb();
    const finalContext = getAccountContext(req, finalDb);
    const matchReply: ChatMessage = {
      id: `msg_match_${Date.now()}`,
      matchId,
      senderId: target.id,
      text: responseText,
      createdAt: Date.now(),
    };
    finalContext.messages.push(matchReply);
    saveAccountContext(req, finalContext, finalDb);
    console.log(`AI profile response sent for ${target.name}`);

    // Broadcast AI message and remove typing indicator
    broadcastToMatch(matchId, { type: "typing", isTyping: false, senderId: target.id });
    broadcastToMatch(matchId, { type: "message", message: matchReply });
  };

  // Run the AI trigger in the background after a 2-second typing delay
  setTimeout(() => {
    triggerAiResponse();
  }, 2200);

  res.json(userMsg);
});

// 11. WebSocket message routing & connection listeners
wss.on("connection", (ws) => {
  let currentMatchId: string | null = null;

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "join") {
        const { matchId } = data;
        if (!matchId) return;

        // Clean up previous room mapping if any
        if (currentMatchId && matchRooms.has(currentMatchId)) {
          matchRooms.get(currentMatchId)?.delete(ws);
        }

        currentMatchId = matchId;
        if (!matchRooms.has(matchId)) {
          matchRooms.set(matchId, new Set());
        }
        matchRooms.get(matchId)?.add(ws);

        // Fetch fresh historical messages and send back to this client
        const db = readDb();
        const now = Date.now();
        const isPremium = db.userProfile.isPremium;
        const EXPIRY_MS = isPremium ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const matchMsgs = db.messages.filter(
          (msg) => msg.matchId === matchId && now - msg.createdAt < EXPIRY_MS
        );
        matchMsgs.sort((a, b) => a.createdAt - b.createdAt);

        ws.send(JSON.stringify({ type: "history", messages: matchMsgs }));
      }

      if (data.type === "typing") {
        const { matchId, isTyping } = data;
        if (matchId) {
          broadcastToMatch(matchId, { type: "typing", isTyping: !!isTyping, senderId: "user" });
        }
      }

      if (data.type === "message") {
        const { matchId, text, mediaUrl, mediaType, voiceDuration } = data;
        if (!matchId) return;
        if (!text && !mediaUrl) return;

        const db = readDb();
        const match = db.matches.find((m) => m.id === matchId);
        if (!match) return;

        const userMsg: ChatMessage = {
          id: `msg_user_${Date.now()}`,
          matchId,
          senderId: "user",
          text: (text || "").trim(),
          createdAt: Date.now(),
          mediaUrl,
          mediaType,
          voiceDuration,
        };

        db.messages.push(userMsg);
        writeDb(db);

        // Broadcast user message to all clients in the match room
        broadcastToMatch(matchId, { type: "message", message: userMsg });

        // Trigger Typing State for AI profile
        broadcastToMatch(matchId, { type: "typing", isTyping: true, senderId: match.profile.id });

        // Generate AI response
        const generateAi = async () => {
          const updatedDb = readDb();
          const target = match.profile;
          const user = updatedDb.userProfile;

          const matchMsgs = updatedDb.messages.filter((m) => m.matchId === matchId);
          matchMsgs.sort((a, b) => a.createdAt - b.createdAt);

          const lastMsgs = matchMsgs.slice(-6);
          const chatHistoryContext = lastMsgs
            .map((m) => {
              let msgDesc = m.text || '';
              if (m.mediaType === 'image') {
                msgDesc += ` [Sent a Photo: ${m.text || 'Aesthetic lifestyle picture'}]`;
              } else if (m.mediaType === 'audio') {
                msgDesc += ` [Sent a Voice Note: ${m.text || 'Speaking with a warm tone'} (${m.voiceDuration || 5}s)]`;
              }
              return `${m.senderId === "user" ? "User" : target.name}: ${msgDesc}`;
            })
            .join("\n");

          let responseText = "";
          if (ai) {
            try {
              const aiPrompt = `
                You are ${target.name}, a ${target.age}-year-old ${target.occupation} with Myers-Briggs profile ${target.mbti}.
                Your bio: "${target.bio}". Your interests are: ${target.interests.join(", ")}.
                
                You are talking to ${user.name}, who is a ${user.occupation} (Bio: "${user.bio}").
                
                Here is your conversation history so far:
                ${chatHistoryContext}
                
                If the user's latest message is a photo (Sent a Photo) or a voice note (Sent a Voice Note), make sure you react to it in character (e.g. praise their voice, comment on the photo vibe, etc.).
                Write your next response message. Keep it realistic, short, engaging, and in character. 
                Use standard messaging language, lowercases, or emoji naturally as fits your personality.
                Do NOT sound like an AI assistant. Speak directly as ${target.name}. Limit response to 1-2 sentences.
              `;

              const response = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: aiPrompt,
                config: {
                  temperature: 0.85,
                }
              });

              responseText = response.text?.trim() || `Wow! That sounds really cool. Tell me more!`;
            } catch (err) {
              console.error("Error generating match response via socket:", err);
              responseText = `Oh that's awesome! I would love to hear more about that. 😊`;
            }
          } else {
            let responses = [
              `That's so interesting! We should definitely chat more about this.`,
              `Oh wow! I totally agree with that. What do you think of coffee shops? ☕`,
              `Haha love that! Let's definitely do something fun soon.`,
              `Nice! Tell me more about what you do as a ${user.occupation}.`,
              `I am honestly so happy we matched. Aura's algorithm actually worked for once! 😊`
            ];
            const lastMsg = lastMsgs[lastMsgs.length - 1];
            if (lastMsg && lastMsg.senderId === 'user') {
              if (lastMsg.mediaType === 'image') {
                responses = [
                  `Oh my gosh, I love this picture! You look/this looks amazing. 😍`,
                  `Wow, what a gorgeous view/shot! Where was this taken?`,
                  `This photo is so aesthetic, I love your vibe! ✨`
                ];
              } else if (lastMsg.mediaType === 'audio') {
                responses = [
                  `Omg, your voice is so soothing! I could listen to you talk all day. 🎙️`,
                  `Haha I love hearing your voice, it makes this feel so much more real!`,
                  `Aw that voice note was so sweet! What are you up to right now?`
                ];
              }
            }
            responseText = responses[Math.floor(Math.random() * responses.length)];
          }

          // Save to db
          const finalDb = readDb();
          const matchReply: ChatMessage = {
            id: `msg_match_${Date.now()}`,
            matchId,
            senderId: target.id,
            text: responseText,
            createdAt: Date.now(),
          };
          finalDb.messages.push(matchReply);
          writeDb(finalDb);

          // Turn off typing indicator & broadcast message
          broadcastToMatch(matchId, { type: "typing", isTyping: false, senderId: target.id });
          broadcastToMatch(matchId, { type: "message", message: matchReply });
        };

        // Delay the response slightly for a realistic live feel
        setTimeout(generateAi, 2000);
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    if (currentMatchId && matchRooms.has(currentMatchId)) {
      matchRooms.get(currentMatchId)?.delete(ws);
    }
  });
});

// Configure Vite or Static Asset Serving

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode with Vite Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteServer = vite;
    app.use(vite.middlewares);
    console.log("Vite middleware mounted for Development.");
  } else {
    // Production Mode with Compiled Static Assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static assets from dist folder in Production.");
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booting! Listening on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
