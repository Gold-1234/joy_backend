import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';
import { supabase } from './supabaseClient.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Middleware to protect agent-only routes
const authenticateAgent = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('Unauthorized attempt to access agent route.');
    return res.status(403).json({ error: 'Forbidden: Invalid auth token' });
  }
  next();
};

// --- ENDPOINTS ---

app.get('/health', (req, res) => {
  res.json('Health OK')
})

app.post('/get-token', async (req, res) => {
  const { deviceId, roomName } = req.body;
  if (!deviceId || !roomName) {
    return res.status(400).json({ error: 'deviceId and roomName are required.' });
  }

  console.log(`Token request for deviceId: ${deviceId}`);

  try {
    // Check if user exists
    const { data: profile, error } = await supabase
      .from('child_profiles')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    let metadata = {};
    if (error || !profile) {
      console.log(`New user detected for deviceId: ${deviceId}`);
      metadata = { deviceId, isNewUser: true };
    } else {
      console.log(`Returning user found: ${profile.name}`);
      // For returning users, pass the entire profile in the metadata
      metadata = { ...profile, isNewUser: false };
    }

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: deviceId,
      name: profile ? profile.name : 'New Friend',
      metadata: JSON.stringify(metadata),
    });

  //   const grant = new VideoGrant({
      
  //   });
  
  // // To prevent echo, set autoSubscribe on the grant itself
  //   grant.setAutoSubscribe(false);

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    
    });
    const token = await at.toJwt();
    console.log(`token : ${token}`);
    
    res.json({ token });

  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/save-user-data', authenticateAgent, async (req, res) => {
  console.log('SAVE USER REQUEST')
  const { deviceId, name, age, city, birthday, interests } = req.body;

  if (!deviceId || !name || !age || !city) {
    return res.status(400).json({ error: 'Missing required user data.' });
  }
  console.log(`Saving data for deviceId: ${deviceId}`, { name, age, city });

  try {
    // Upsert ensures we can create or update the profile
    const { data, error } = await supabase
      .from('child_profiles')
      .upsert({ device_id: deviceId, name, age, city, birthday, interests }, { onConflict: 'device_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving user data:', error);
      throw error;
    }

    console.log('Successfully saved user data:', data);
    res.status(200).json({ success: true, user: data });

  } catch (err) {
    res.status(500).json({ error: 'Failed to save user data.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});