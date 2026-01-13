// server.js
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());



// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// ====== Multer setup for official signatures and pictures ======
const signaturesDir = 'uploads/signatures';
const picturesDir = 'uploads/pictures';
fs.mkdirSync(signaturesDir, { recursive: true });
fs.mkdirSync(picturesDir, { recursive: true });

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, signaturesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const pictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, picturesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const uploadSignature = multer({ storage: signatureStorage });
const uploadPicture = multer({ storage: pictureStorage });

// Combined upload for both signature and picture
const uploadOfficialFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Route to appropriate directory based on field name
      if (file.fieldname === 'signature') {
        cb(null, signaturesDir);
      } else if (file.fieldname === 'picture') {
        cb(null, picturesDir);
      } else {
        cb(null, signaturesDir); // default
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${Date.now()}-${base}${ext}`);
    },
  }),
}).fields([
  { name: 'signature', maxCount: 1 },
  { name: 'picture', maxCount: 1 },
]);

// Keep the old upload for backward compatibility
const upload = uploadSignature;

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// ===== Helper: token from header =====
function getTokenFromHeader(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return authHeader;
}

// ===== Middleware: verify token =====
function verifyToken(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, full_name }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.error('JWT error: Token expired');
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    console.error('JWT error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ===================== AUTH =====================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name) {
      return res
        .status(400)
        .json({ message: 'username, password, and full_name are required.' });
    }

    // Check if username exists
    const existing = await query('SELECT id FROM users WHERE username = ?', [
      username,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?)`,
      [username, password_hash, full_name, role || 'Staff']
    );

    const created = await query('SELECT id, username, full_name, role FROM users WHERE id = ?', [
      result.insertId,
    ]);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required.' });
    }

    const users = await query(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: payload,
    });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// GET /api/auth/me (current user)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  res.json(req.user);
});

// ===================== RESIDENTS =====================

// GET /api/residents - public view
app.get('/api/residents', async (req, res) => {
  try {
    // Update age for all residents based on birthdate
    const residents = await query(
      'SELECT * FROM residents ORDER BY last_name, first_name'
    );
    
    // Update ages in database
    for (const resident of residents) {
      if (resident.birthdate) {
        const age = calculateAge(resident.birthdate);
        if (age !== resident.age) {
          await query('UPDATE residents SET age = ? WHERE id = ?', [age, resident.id]);
          resident.age = age;
        }
      }
    }
    
    res.json(residents);
  } catch (err) {
    console.error('Error fetching residents:', err);
    res.status(500).json({ message: 'Error fetching residents' });
  }
});

// Helper function to calculate age from birthdate
function calculateAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// POST /api/residents - create (protected)
app.post('/api/residents', verifyToken, async (req, res) => {
  try {
    const {
      last_name,
      first_name,
      middle_name,
      suffix,
      nickname,
      sex,
      birthdate,
      civil_status,
      employment_status,
      registered_voter,
      resident_status,
      is_senior_citizen,
      is_pwd,
      contact_no,
      address,
    } = req.body;

    // Validation
    if (!last_name || !first_name || !sex) {
      return res
        .status(400)
        .json({ message: 'last_name, first_name, and sex are required.' });
    }

    // Sanitize inputs
    const sanitizedLastName = last_name.trim();
    const sanitizedFirstName = first_name.trim();
    const sanitizedMiddleName = middle_name ? middle_name.trim() : null;
    const sanitizedSuffix = suffix ? suffix.trim() : null;
    const sanitizedNickname = nickname ? nickname.trim() : null;
    const sanitizedContactNo = contact_no ? contact_no.trim() : null;
    const sanitizedAddress = address ? address.trim() : null;

    // Validate length constraints
    if (sanitizedLastName.length > 100) {
      return res.status(400).json({ message: 'Last name must be 100 characters or less.' });
    }
    if (sanitizedFirstName.length > 100) {
      return res.status(400).json({ message: 'First name must be 100 characters or less.' });
    }
    if (sanitizedContactNo && sanitizedContactNo.length > 50) {
      return res.status(400).json({ message: 'Contact number must be 50 characters or less.' });
    }

    // Validate enum values
    const validSex = ['Male', 'Female', 'Other'];
    if (!validSex.includes(sex)) {
      return res.status(400).json({ message: `sex must be one of: ${validSex.join(', ')}` });
    }

    const age = calculateAge(birthdate);

    const result = await query(
      `INSERT INTO residents
       (last_name, first_name, middle_name, suffix, nickname, sex, birthdate, age,
        civil_status, employment_status, registered_voter, resident_status,
        is_senior_citizen, is_pwd, contact_no, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sanitizedLastName,
        sanitizedFirstName,
        sanitizedMiddleName,
        sanitizedSuffix,
        sanitizedNickname,
        sex,
        birthdate || null,
        age,
        civil_status || null,
        employment_status || null,
        registered_voter || null,
        resident_status || 'Resident',
        is_senior_citizen ? 1 : 0,
        is_pwd ? 1 : 0,
        sanitizedContactNo,
        sanitizedAddress,
      ]
    );

    const created = await query('SELECT * FROM residents WHERE id = ?', [
      result.insertId,
    ]);

    // Log the action
    const residentName = `${first_name} ${middle_name ? middle_name.charAt(0) + '.' : ''} ${last_name}`.trim();
    await createHistoryLog(req, `created a new resident: ${residentName}`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating resident:', err);
    res.status(500).json({ message: 'Error creating resident' });
  }
});

// PUT /api/residents/:id - update (protected)
app.put('/api/residents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      last_name,
      first_name,
      middle_name,
      suffix,
      nickname,
      sex,
      birthdate,
      civil_status,
      employment_status,
      registered_voter,
      resident_status,
      is_senior_citizen,
      is_pwd,
      contact_no,
      address,
    } = req.body;

    const age = calculateAge(birthdate);

    await query(
      `UPDATE residents
       SET last_name = ?, first_name = ?, middle_name = ?, suffix = ?, nickname = ?,
           sex = ?, birthdate = ?, age = ?, civil_status = ?, employment_status = ?,
           registered_voter = ?, resident_status = ?, is_senior_citizen = ?,
           is_pwd = ?, contact_no = ?, address = ?
       WHERE id = ?`,
      [
        last_name,
        first_name,
        middle_name || null,
        suffix || null,
        nickname || null,
        sex,
        birthdate || null,
        age,
        civil_status || null,
        employment_status || null,
        registered_voter || null,
        resident_status || 'Resident',
        is_senior_citizen ? 1 : 0,
        is_pwd ? 1 : 0,
        contact_no || null,
        address || null,
        id,
      ]
    );

    const updated = await query('SELECT * FROM residents WHERE id = ?', [id]);
    
    // Log the action
    const residentName = `${first_name} ${middle_name ? middle_name.charAt(0) + '.' : ''} ${last_name}`.trim();
    await createHistoryLog(req, `updated resident information: ${residentName}`);

    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating resident:', err);
    res.status(500).json({ message: 'Error updating resident' });
  }
});

// ===================== HOUSEHOLDS =====================

// GET /api/households
app.get('/api/households', async (req, res) => {
  try {
    const households = await query(
      `SELECT h.*,
              COUNT(hm.id) AS member_count
       FROM households h
       LEFT JOIN household_members hm ON hm.household_id = h.id
       GROUP BY h.id
       ORDER BY h.household_name`
    );
    res.json(households);
  } catch (err) {
    console.error('Error fetching households:', err);
    res.status(500).json({ message: 'Error fetching households' });
  }
});

// POST /api/households (protected)
app.post('/api/households', verifyToken, async (req, res) => {
  try {
    const { household_name, address, purok, num_members } = req.body;

    // Validation
    if (!household_name || !address) {
      return res
        .status(400)
        .json({ message: 'household_name and address are required.' });
    }

    // Sanitize inputs
    const sanitizedName = household_name.trim();
    const sanitizedAddress = address.trim();
    const sanitizedPurok = purok ? purok.trim() : null;
    const sanitizedNumMembers = Math.max(1, parseInt(num_members) || 1);

    // Validate length constraints
    if (sanitizedName.length > 100) {
      return res.status(400).json({ 
        message: 'Household name must be 100 characters or less.' 
      });
    }
    if (sanitizedAddress.length > 255) {
      return res.status(400).json({ 
        message: 'Address must be 255 characters or less.' 
      });
    }

    const result = await query(
      `INSERT INTO households (household_name, address, purok, num_members)
       VALUES (?, ?, ?, ?)`,
      [sanitizedName, sanitizedAddress, sanitizedPurok, sanitizedNumMembers]
    );

    const created = await query('SELECT * FROM households WHERE id = ?', [
      result.insertId,
    ]);
    
    // Log the action
    await createHistoryLog(req, `created a new household: ${sanitizedName}`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating household:', err);
    res.status(500).json({ message: 'Error creating household' });
  }
});

// PUT /api/households/:id (protected)
app.put('/api/households/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { household_name, address, purok, num_members } = req.body;

    // Validation
    if (!household_name || !address) {
      return res.status(400).json({ 
        message: 'household_name and address are required.' 
      });
    }

    // Validate household exists
    const existing = await query('SELECT * FROM households WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Household not found.' });
    }

    // Get actual member count
    const actualMemberCount = await query(
      `SELECT COUNT(*) as count FROM household_members WHERE household_id = ?`,
      [id]
    );
    const actualCount = actualMemberCount[0].count;

    // Use actual count if num_members is not provided or is less than actual
    const finalNumMembers = num_members 
      ? Math.max(parseInt(num_members) || actualCount, actualCount)
      : actualCount;

    await query(
      `UPDATE households
       SET household_name = ?, address = ?, purok = ?, num_members = ?
       WHERE id = ?`,
      [household_name.trim(), address.trim(), purok ? purok.trim() : null, finalNumMembers, id]
    );

    const updated = await query('SELECT * FROM households WHERE id = ?', [id]);
    
    // Log the action
    await createHistoryLog(req, `updated household: ${household_name}`);

    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating household:', err);
    res.status(500).json({ message: 'Error updating household' });
  }
});

// GET /api/households/:id/members
app.get('/api/households/:id/members', async (req, res) => {
  try {
    const householdId = req.params.id;
    const members = await query(
      `SELECT hm.id,
              r.id AS resident_id,
              r.first_name,
              r.last_name,
              r.middle_name,
              r.suffix,
              r.nickname,
              r.sex,
              r.birthdate,
              r.age,
              r.civil_status,
              r.employment_status,
              r.registered_voter,
              r.resident_status,
              r.is_senior_citizen,
              r.is_pwd,
              r.contact_no,
              r.address,
              hm.relation_to_head
       FROM household_members hm
       JOIN residents r ON r.id = hm.resident_id
       WHERE hm.household_id = ?
       ORDER BY r.last_name, r.first_name`,
      [householdId]
    );
    
    // Update ages for members
    for (const member of members) {
      if (member.birthdate) {
        const age = calculateAge(member.birthdate);
        if (age !== member.age) {
          await query('UPDATE residents SET age = ? WHERE id = ?', [age, member.resident_id]);
          member.age = age;
        }
      }
    }
    
    res.json(members);
  } catch (err) {
    console.error('Error fetching household members:', err);
    res.status(500).json({ message: 'Error fetching household members' });
  }
});

// POST /api/households/:id/members (protected)
app.post('/api/households/:id/members', verifyToken, async (req, res) => {
  try {
    const householdId = req.params.id;
    const { resident_id, relation_to_head } = req.body;

    // Validation
    if (!resident_id) {
      return res
        .status(400)
        .json({ message: 'resident_id is required to add member.' });
    }

    // Validate household exists
    const household = await query('SELECT * FROM households WHERE id = ?', [householdId]);
    if (household.length === 0) {
      return res.status(404).json({ message: 'Household not found.' });
    }

    // Validate resident exists
    const resident = await query('SELECT * FROM residents WHERE id = ?', [resident_id]);
    if (resident.length === 0) {
      return res.status(404).json({ message: 'Resident not found.' });
    }

    // Check if resident is already in this household (prevent duplicates)
    const existingMember = await query(
      `SELECT * FROM household_members 
       WHERE household_id = ? AND resident_id = ?`,
      [householdId, resident_id]
    );
    if (existingMember.length > 0) {
      return res.status(409).json({ 
        message: 'This resident is already a member of this household.' 
      });
    }

    // Validate relation_to_head if provided
    const validRelations = [
      'Head', 'Spouse', 'Child', 'Parent', 'Sibling', 
      'Grandchild', 'Grandparent', 'Other', 'Self'
    ];
    if (relation_to_head && !validRelations.includes(relation_to_head)) {
      return res.status(400).json({ 
        message: `Invalid relation_to_head. Must be one of: ${validRelations.join(', ')}` 
      });
    }

    const result = await query(
      `INSERT INTO household_members (household_id, resident_id, relation_to_head)
       VALUES (?, ?, ?)`,
      [householdId, resident_id, relation_to_head || null]
    );

    const created = await query(
      `SELECT hm.id,
              r.id AS resident_id,
              r.first_name,
              r.last_name,
              hm.relation_to_head
       FROM household_members hm
       JOIN residents r ON r.id = hm.resident_id
       WHERE hm.id = ?`,
      [result.insertId]
    );

    // Log the action
    const residentName = `${created[0].first_name} ${created[0].last_name}`;
    await createHistoryLog(req, `added ${residentName} to household`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error adding household member:', err);
    // Handle duplicate key error
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'This resident is already a member of this household.' 
      });
    }
    res.status(500).json({ message: 'Error adding household member' });
  }
});

// DELETE /api/households/:id/members/:memberId (protected)
app.delete('/api/households/:id/members/:memberId', verifyToken, async (req, res) => {
  try {
    const householdId = req.params.id;
    const memberId = req.params.memberId;

    // Check if member exists and belongs to this household
    const member = await query(
      `SELECT hm.*, r.first_name, r.last_name
       FROM household_members hm
       JOIN residents r ON r.id = hm.resident_id
       WHERE hm.id = ? AND hm.household_id = ?`,
      [memberId, householdId]
    );

    if (member.length === 0) {
      return res.status(404).json({ 
        message: 'Household member not found or does not belong to this household.' 
      });
    }

    // Prevent deleting if it's the last member (household must have at least 1 member)
    const memberCount = await query(
      `SELECT COUNT(*) as count FROM household_members WHERE household_id = ?`,
      [householdId]
    );

    if (memberCount[0].count <= 1) {
      return res.status(400).json({ 
        message: 'Cannot remove the last member from a household. Delete the household instead.' 
      });
    }

    // Delete the member (trigger will update num_members automatically)
    await query(
      `DELETE FROM household_members WHERE id = ? AND household_id = ?`,
      [memberId, householdId]
    );

    // Log the action
    const residentName = `${member[0].first_name} ${member[0].last_name}`;
    await createHistoryLog(req, `removed ${residentName} from household`);

    res.json({ message: 'Household member removed successfully.' });
  } catch (err) {
    console.error('Error removing household member:', err);
    res.status(500).json({ message: 'Error removing household member' });
  }
});

// POST /api/households-with-residents - create household with multiple residents (protected)
app.post('/api/households-with-residents', verifyToken, async (req, res) => {
  try {
    const { household_name, address, purok, num_members, residents } = req.body;

    if (!household_name || !address) {
      return res
        .status(400)
        .json({ message: 'household_name and address are required.' });
    }

    if (!residents || !Array.isArray(residents) || residents.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one resident is required.' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create household
      // Use num_members from form, or default to actual number of residents if not provided
      const memberCount = num_members || residents.length;
      const [householdResult] = await connection.query(
        `INSERT INTO households (household_name, address, purok, num_members)
         VALUES (?, ?, ?, ?)`,
        [household_name, address, purok || null, memberCount]
      );
      const householdId = householdResult.insertId;

      // Create residents and add to household
      const createdResidents = [];
      const validRelations = [
        'Head', 'Spouse', 'Child', 'Parent', 'Sibling', 
        'Grandchild', 'Grandparent', 'Other', 'Self'
      ];

      for (const residentData of residents) {
        const {
          last_name,
          first_name,
          middle_name,
          suffix,
          nickname,
          sex,
          birthdate,
          civil_status,
          employment_status,
          registered_voter,
          resident_status,
          is_senior_citizen,
          is_pwd,
          contact_no,
          relation_to_head,
        } = residentData;

        // Validation
        if (!last_name || !first_name || !sex) {
          throw new Error('last_name, first_name, and sex are required for each resident.');
        }

        // Sanitize inputs
        const sanitizedLastName = last_name.trim();
        const sanitizedFirstName = first_name.trim();
        const sanitizedMiddleName = middle_name ? middle_name.trim() : null;
        const sanitizedSuffix = suffix ? suffix.trim() : null;
        const sanitizedNickname = nickname ? nickname.trim() : null;
        const sanitizedContactNo = contact_no ? contact_no.trim() : null;
        const sanitizedRelation = relation_to_head && validRelations.includes(relation_to_head) 
          ? relation_to_head 
          : null;

        // Validate enum values
        const validSex = ['Male', 'Female', 'Other'];
        if (!validSex.includes(sex)) {
          throw new Error(`sex must be one of: ${validSex.join(', ')}`);
        }

        const age = calculateAge(birthdate);

        const [residentResult] = await connection.query(
          `INSERT INTO residents
           (last_name, first_name, middle_name, suffix, nickname, sex, birthdate, age,
            civil_status, employment_status, registered_voter, resident_status,
            is_senior_citizen, is_pwd, contact_no, address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sanitizedLastName,
            sanitizedFirstName,
            sanitizedMiddleName,
            sanitizedSuffix,
            sanitizedNickname,
            sex,
            birthdate || null,
            age,
            civil_status || null,
            employment_status || null,
            registered_voter || null,
            resident_status || 'Resident',
            is_senior_citizen ? 1 : 0,
            is_pwd ? 1 : 0,
            sanitizedContactNo,
            address ? address.trim() : address, // Use household address if not provided
          ]
        );

        const residentId = residentResult.insertId;

        // Add to household_members
        await connection.query(
          `INSERT INTO household_members (household_id, resident_id, relation_to_head)
           VALUES (?, ?, ?)`,
          [householdId, residentId, sanitizedRelation]
        );

        const [createdResident] = await connection.query(
          'SELECT * FROM residents WHERE id = ?',
          [residentId]
        );
        createdResidents.push(createdResident[0]);
      }

      await connection.commit();
      connection.release();

      // Fetch the created household with member count
      const household = await query(
        `SELECT h.*, COUNT(hm.id) AS member_count
         FROM households h
         LEFT JOIN household_members hm ON hm.household_id = h.id
         WHERE h.id = ?
         GROUP BY h.id`,
        [householdId]
      );

      // Log the action
      await createHistoryLog(req, `created household "${household_name}" with ${residents.length} resident(s)`);

      res.status(201).json({
        household: household[0],
        residents: createdResidents,
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error('Error creating household with residents:', err);
    res.status(500).json({ message: err.message || 'Error creating household with residents' });
  }
});

// ===================== INCIDENTS =====================

// GET /api/incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const incidents = await query(
      `SELECT i.*,
              c.first_name AS complainant_first_name,
              c.last_name AS complainant_last_name,
              r.first_name AS respondent_first_name,
              r.last_name AS respondent_last_name
       FROM incidents i
       LEFT JOIN residents c ON c.id = i.complainant_id
       LEFT JOIN residents r ON r.id = i.respondent_id
       ORDER BY i.incident_date DESC`
    );
    res.json(incidents);
  } catch (err) {
    console.error('Error fetching incidents:', err);
    res.status(500).json({ message: 'Error fetching incidents' });
  }
});

// POST /api/incidents (protected)
app.post('/api/incidents', verifyToken, async (req, res) => {
  try {
    const {
      incident_date,
      incident_type,
      location,
      description,
      complainant_id,
      complainant_name,
      respondent_id,
      status,
    } = req.body;

    if (!incident_date || !incident_type) {
      return res
        .status(400)
        .json({ message: 'incident_date and incident_type are required.' });
    }

    const result = await query(
      `INSERT INTO incidents
       (incident_date, incident_type, location, description,
        complainant_id, complainant_name, respondent_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incident_date,
        incident_type,
        location || null,
        description || null,
        complainant_id || null,
        complainant_name || null,
        respondent_id || null,
        status || 'Open',
      ]
    );

    const created = await query('SELECT * FROM incidents WHERE id = ?', [
      result.insertId,
    ]);
    
    // Log the action
    const incidentDesc = complainant_name || (complainant_id ? 'a resident' : 'unknown');
    await createHistoryLog(req, `recorded a new ${incident_type} incident involving ${incidentDesc}`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating incident:', err);
    res.status(500).json({ message: 'Error creating incident' });
  }
});

// PUT /api/incidents/:id (protected)
app.put('/api/incidents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      incident_date,
      incident_type,
      location,
      description,
      complainant_id,
      complainant_name,
      respondent_id,
      status,
    } = req.body;

    await query(
      `UPDATE incidents
       SET incident_date = ?, incident_type = ?, location = ?,
           description = ?, complainant_id = ?, complainant_name = ?, respondent_id = ?, status = ?
       WHERE id = ?`,
      [
        incident_date,
        incident_type,
        location || null,
        description || null,
        complainant_id || null,
        complainant_name || null,
        respondent_id || null,
        status || 'Open',
        id,
      ]
    );

    const updated = await query('SELECT * FROM incidents WHERE id = ?', [id]);
    
    // Log the action
    await createHistoryLog(req, `updated incident #${id} - Status: ${status || 'Open'}`);

    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating incident:', err);
    res.status(500).json({ message: 'Error updating incident' });
  }
});

// DELETE /api/incidents/:id (protected)
app.delete('/api/incidents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if incident exists
    const incidents = await query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (incidents.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const incident = incidents[0];

    // Delete the incident
    await query('DELETE FROM incidents WHERE id = ?', [id]);
    
    // Log the action
    const incidentDesc = incident.incident_type || 'incident';
    await createHistoryLog(req, `deleted ${incidentDesc} incident #${id}`);

    res.json({ message: 'Incident deleted successfully' });
  } catch (err) {
    console.error('Error deleting incident:', err);
    res.status(500).json({ message: 'Error deleting incident' });
  }
});

// ===================== SERVICES =====================

// GET /api/services
app.get('/api/services', async (req, res) => {
  try {
    const services = await query(
      `SELECT s.*,
              COUNT(sb.id) AS beneficiary_count
       FROM services s
       LEFT JOIN service_beneficiaries sb ON sb.service_id = s.id
       GROUP BY s.id
       ORDER BY s.service_date DESC, s.service_name`
    );
    res.json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ message: 'Error fetching services' });
  }
});

// POST /api/services (protected)
app.post('/api/services', verifyToken, async (req, res) => {
  try {
    const { service_name, description, service_date, location } = req.body;

    if (!service_name) {
      return res.status(400).json({ message: 'service_name is required.' });
    }

    const result = await query(
      `INSERT INTO services (service_name, description, service_date, location)
       VALUES (?, ?, ?, ?)`,
      [service_name, description || null, service_date || null, location || null]
    );

    const created = await query('SELECT * FROM services WHERE id = ?', [
      result.insertId,
    ]);
    
    // Log the action
    await createHistoryLog(req, `created a new service: ${service_name}`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ message: 'Error creating service' });
  }
});

// PUT /api/services/:id (protected)
app.put('/api/services/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, service_date, location } = req.body;

    await query(
      `UPDATE services
       SET service_name = ?, description = ?, service_date = ?, location = ?
       WHERE id = ?`,
      [service_name, description || null, service_date || null, location || null, id]
    );

    const updated = await query('SELECT * FROM services WHERE id = ?', [id]);
    
    // Log the action
    await createHistoryLog(req, `updated service: ${service_name}`);

    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ message: 'Error updating service' });
  }
});

// DELETE /api/services/:id (protected)
app.delete('/api/services/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const services = await query('SELECT * FROM services WHERE id = ?', [id]);
    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const service = services[0];

    // Check if service has beneficiaries
    const beneficiaries = await query(
      'SELECT COUNT(*) as count FROM service_beneficiaries WHERE service_id = ?',
      [id]
    );

    if (beneficiaries[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete service. It has beneficiaries. Please remove them first.' 
      });
    }

    // Delete the service
    await query('DELETE FROM services WHERE id = ?', [id]);
    
    // Log the action
    await createHistoryLog(req, `deleted service: ${service.service_name}`);

    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ message: 'Error deleting service' });
  }
});

// GET /api/services/:id/beneficiaries
app.get('/api/services/:id/beneficiaries', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const beneficiaries = await query(
      `SELECT sb.id,
              r.id AS resident_id,
              r.first_name,
              r.last_name,
              sb.notes
       FROM service_beneficiaries sb
       JOIN residents r ON r.id = sb.resident_id
       WHERE sb.service_id = ?
       ORDER BY r.last_name, r.first_name`,
      [serviceId]
    );
    res.json(beneficiaries);
  } catch (err) {
    console.error('Error fetching beneficiaries:', err);
    res.status(500).json({ message: 'Error fetching beneficiaries' });
  }
});

// POST /api/services/:id/beneficiaries (protected)
app.post('/api/services/:id/beneficiaries', verifyToken, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const { resident_id, notes } = req.body;

    if (!resident_id) {
      return res
        .status(400)
        .json({ message: 'resident_id is required for beneficiary.' });
    }

    const result = await query(
      `INSERT INTO service_beneficiaries (service_id, resident_id, notes)
       VALUES (?, ?, ?)`,
      [serviceId, resident_id, notes || null]
    );

    const created = await query(
      `SELECT sb.id,
              r.id AS resident_id,
              r.first_name,
              r.last_name,
              sb.notes
       FROM service_beneficiaries sb
       JOIN residents r ON r.id = sb.resident_id
       WHERE sb.id = ?`,
      [result.insertId]
    );

    // Log the action
    const residentName = `${created[0].first_name} ${created[0].last_name}`;
    await createHistoryLog(req, `added ${residentName} as beneficiary to service`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error adding beneficiary:', err);
    res.status(500).json({ message: 'Error adding beneficiary' });
  }
});

// DELETE /api/services/:id/beneficiaries/:beneficiaryId (protected)
app.delete('/api/services/:id/beneficiaries/:beneficiaryId', verifyToken, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const beneficiaryId = req.params.beneficiaryId;

    // Check if beneficiary exists and belongs to this service
    const beneficiaries = await query(
      `SELECT sb.*, r.first_name, r.last_name
       FROM service_beneficiaries sb
       JOIN residents r ON r.id = sb.resident_id
       WHERE sb.id = ? AND sb.service_id = ?`,
      [beneficiaryId, serviceId]
    );

    if (beneficiaries.length === 0) {
      return res.status(404).json({ 
        message: 'Beneficiary not found or does not belong to this service.' 
      });
    }

    const beneficiary = beneficiaries[0];

    // Delete the beneficiary
    await query(
      'DELETE FROM service_beneficiaries WHERE id = ? AND service_id = ?',
      [beneficiaryId, serviceId]
    );

    // Log the action
    const residentName = `${beneficiary.first_name} ${beneficiary.last_name}`;
    await createHistoryLog(req, `removed ${residentName} as beneficiary from service`);

    res.json({ message: 'Beneficiary removed successfully' });
  } catch (err) {
    console.error('Error removing beneficiary:', err);
    res.status(500).json({ message: 'Error removing beneficiary' });
  }
});

// ===================== CERTIFICATES =====================

// POST /api/certificates - create certificate request (protected)
app.post('/api/certificates', verifyToken, async (req, res) => {
  try {
    const {
      resident_id,
      certificate_type,
      purpose,
      issue_date,
      place_issued,
      or_number,
      amount,
    } = req.body;

    if (!resident_id || !certificate_type || !issue_date) {
      return res.status(400).json({
        message: 'resident_id, certificate_type, and issue_date are required.',
      });
    }

    const result = await query(
      `INSERT INTO certificates
       (resident_id, certificate_type, purpose, issue_date, place_issued, or_number, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        resident_id,
        certificate_type,
        purpose || null,
        issue_date,
        place_issued || null,
        or_number || null,
        amount || null,
      ]
    );

    const created = await query('SELECT * FROM certificates WHERE id = ?', [
      result.insertId,
    ]);

    // Get resident name for logging
    const residents = await query('SELECT first_name, last_name, middle_name FROM residents WHERE id = ?', [resident_id]);
    const resident = residents[0];
    const residentName = `${resident.first_name} ${resident.middle_name ? resident.middle_name.charAt(0) + '.' : ''} ${resident.last_name}`.trim();

    // Log the action using helper function
    await createHistoryLog(req, `released a ${certificate_type} for ${residentName}`);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating certificate:', err);
    res.status(500).json({ message: 'Error creating certificate' });
  }
});

// GET /api/certificates - get all certificates
app.get('/api/certificates', async (req, res) => {
  try {
    const certificates = await query(
      `SELECT c.*,
              r.first_name,
              r.last_name,
              r.middle_name
       FROM certificates c
       JOIN residents r ON r.id = c.resident_id
       ORDER BY c.issue_date DESC, c.created_at DESC`
    );
    res.json(certificates);
  } catch (err) {
    console.error('Error fetching certificates:', err);
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});

// GET /api/residents/:id/certificates - get certificates for a specific resident
app.get('/api/residents/:id/certificates', async (req, res) => {
  try {
    const residentId = req.params.id;
    const certificates = await query(
      `SELECT * FROM certificates
       WHERE resident_id = ?
       ORDER BY issue_date DESC, created_at DESC`,
      [residentId]
    );
    res.json(certificates);
  } catch (err) {
    console.error('Error fetching resident certificates:', err);
    res.status(500).json({ message: 'Error fetching resident certificates' });
  }
});

// ===================== HISTORY LOGS =====================

// Helper function to create history log
async function createHistoryLog(req, action) {
  try {
    // Get user info from request (set by verifyToken middleware)
    const userId = req.user?.id || null;
    const userName = req.user?.full_name || 'Unknown';
    
    // Try to find if user is an official to get their position
    let userRole = req.user?.role || null;
    if (req.user?.full_name) {
      try {
        const officials = await query(
          'SELECT position FROM officials WHERE full_name = ? LIMIT 1',
          [req.user.full_name]
        );
        if (officials.length > 0) {
          userRole = officials[0].position;
        }
      } catch (err) {
        // Ignore errors when checking officials
      }
    }

    // Format action with "The" prefix if it's an official position
    let formattedAction = action;
    if (userRole && (userRole.includes('Barangay') || userRole.includes('Punong') || userRole.includes('Chairman'))) {
      formattedAction = `The ${userRole} ${action}`;
    } else if (req.user?.role === 'Admin') {
      formattedAction = `The Chairman ${action}`;
    } else {
      formattedAction = `${userName} ${action}`;
    }

    await query(
      `INSERT INTO history_logs (user_id, user_name, user_role, action)
       VALUES (?, ?, ?, ?)`,
      [userId, userName, userRole, formattedAction]
    );
  } catch (err) {
    // Don't throw - logging failures shouldn't break the main operation
    if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes('doesn\'t exist') || err.message?.includes('Unknown table')) {
      console.warn('History logs table does not exist. Please run migration_add_history_logs_table.sql');
    } else {
      console.error('Error creating history log:', err.message);
    }
  }
}

// GET /api/history-logs - get all history logs
app.get('/api/history-logs', verifyToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // Try to query the history_logs table
    let logs;
    try {
      logs = await query(
        `SELECT id, user_id, user_name, user_role, action, created_at
         FROM history_logs
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
      );
    } catch (dbErr) {
      // If table doesn't exist, return helpful error message
      if (dbErr.code === 'ER_NO_SUCH_TABLE' || dbErr.message?.includes('doesn\'t exist') || dbErr.message?.includes('Unknown table')) {
        console.error('History logs table does not exist. Please run migration_add_history_logs_table.sql');
        return res.status(500).json({ 
          message: 'History logs table does not exist. Please run the database migration.',
          error: 'Table not found',
          migrationFile: 'migration_add_history_logs_table.sql'
        });
      }
      throw dbErr;
    }
    
    res.json(logs || []);
  } catch (err) {
    console.error('Error fetching history logs:', err);
    res.status(500).json({ message: 'Error fetching history logs', error: err.message });
  }
});

// POST /api/history-logs - create history log (protected)
app.post('/api/history-logs', verifyToken, async (req, res) => {
  try {
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'action is required.' });
    }

    const result = await query(
      `INSERT INTO history_logs (user_id, user_name, user_role, action)
       VALUES (?, ?, ?, ?)`,
      [
        req.user?.id || null,
        req.user?.full_name || 'Unknown',
        req.user?.role || null,
        action
      ]
    );

    const created = await query('SELECT * FROM history_logs WHERE id = ?', [
      result.insertId,
    ]);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating history log:', err);
    res.status(500).json({ message: 'Error creating history log' });
  }
});

// Test route to verify history-logs endpoint and table exists
app.get('/api/history-logs/test', verifyToken, async (req, res) => {
  try {
    // Try to query the table
    await query('SELECT COUNT(*) as count FROM history_logs LIMIT 1');
    res.json({ 
      message: 'History logs endpoint is accessible',
      tableExists: true,
      status: 'OK'
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes('doesn\'t exist') || err.message?.includes('Unknown table')) {
      res.status(500).json({ 
        message: 'History logs table does not exist',
        tableExists: false,
        error: 'Please run migration_add_history_logs_table.sql',
        migrationFile: 'migration_add_history_logs_table.sql'
      });
    } else {
      res.status(500).json({ 
        message: 'Error checking history logs table',
        error: err.message
      });
    }
  }
});

// Root
app.get('/', (req, res) => {
  res.send('Barangay System API running...');
});
// ===================== BARANGAY PROFILE =====================

// GET /api/barangay-profile
app.get('/api/barangay-profile', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, barangay_name, municipality, province, place_issued FROM barangay_profile LIMIT 1'
    );

    if (rows.length === 0) {
      // No record yet – send some defaults (optional)
      return res.json(null);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching barangay profile:', err);
    res.status(500).json({ message: 'Error fetching barangay profile' });
  }
});

// PUT /api/barangay-profile (protected, upsert)
app.put('/api/barangay-profile', verifyToken, async (req, res) => {
  try {
    const { barangay_name, municipality, province, place_issued } = req.body;

    if (!barangay_name || !municipality || !province) {
      return res.status(400).json({
        message: 'barangay_name, municipality, and province are required.',
      });
    }

    const existing = await query(
      'SELECT id FROM barangay_profile LIMIT 1'
    );

    if (existing.length > 0) {
      const id = existing[0].id;
      await query(
        `UPDATE barangay_profile
         SET barangay_name = ?, municipality = ?, province = ?, place_issued = ?
         WHERE id = ?`,
        [barangay_name, municipality, province, place_issued || null, id]
      );
    } else {
      await query(
        `INSERT INTO barangay_profile
         (barangay_name, municipality, province, place_issued)
         VALUES (?, ?, ?, ?)`,
        [barangay_name, municipality, province, place_issued || null]
      );
    }

    const rows = await query(
      'SELECT id, barangay_name, municipality, province, place_issued FROM barangay_profile LIMIT 1'
    );
    
    // Log the action
    await createHistoryLog(req, `updated barangay profile: ${barangay_name}, ${municipality}, ${province}`);

    res.json(rows[0]);
  } catch (err) {
    console.error('Error saving barangay profile:', err);
    res.status(500).json({ message: 'Error saving barangay profile' });
  }
});


// ===================== OFFICIALS =====================

// GET /api/officials
app.get('/api/officials', async (req, res) => {
  try {
    const officials = await query(
      `SELECT id, full_name, position, order_no,
              is_captain, is_secretary, signature_path, picture_path
       FROM officials
       ORDER BY order_no, position, full_name`
    );
    res.json(officials);
  } catch (err) {
    console.error('Error fetching officials:', err);
    res.status(500).json({ message: 'Error fetching officials' });
  }
});

// POST /api/officials (protected, with signature and picture upload)
app.post(
  '/api/officials',
  verifyToken,
  uploadOfficialFiles,
  async (req, res) => {
    try {
      const { full_name, position, order_no, is_captain, is_secretary } =
        req.body;

      if (!full_name || !position) {
        return res
          .status(400)
          .json({ message: 'full_name and position are required.' });
      }

      const signatureFile = req.files?.signature?.[0];
      const pictureFile = req.files?.picture?.[0];

      const signature_path = signatureFile
        ? `/uploads/signatures/${signatureFile.filename}`
        : null;
      
      const picture_path = pictureFile
        ? `/uploads/pictures/${pictureFile.filename}`
        : null;

      const result = await query(
        `INSERT INTO officials
         (full_name, position, order_no, is_captain, is_secretary, signature_path, picture_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          full_name,
          position,
          order_no || 0,
          is_captain === '1' ? 1 : 0,
          is_secretary === '1' ? 1 : 0,
          signature_path,
          picture_path,
        ]
      );

      const created = await query(
        'SELECT * FROM officials WHERE id = ?',
        [result.insertId]
      );
      
      // Log the action
      await createHistoryLog(req, `added a new official: ${full_name} (${position})`);

      res.status(201).json(created[0]);
    } catch (err) {
      console.error('Error creating official:', err);
      res.status(500).json({ message: 'Error creating official' });
    }
  }
);

// PUT /api/officials/:id (protected, optional new signature and picture)
app.put(
  '/api/officials/:id',
  verifyToken,
  uploadOfficialFiles,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { full_name, position, order_no, is_captain, is_secretary } =
        req.body;

      const signatureFile = req.files?.signature?.[0];
      const pictureFile = req.files?.picture?.[0];

      // Get current official data
      const current = await query('SELECT * FROM officials WHERE id = ?', [id]);
      if (current.length === 0) {
        return res.status(404).json({ message: 'Official not found' });
      }

      const currentOfficial = current[0];
      
      // Determine paths - use new file if uploaded, otherwise keep existing
      const signature_path = signatureFile
        ? `/uploads/signatures/${signatureFile.filename}`
        : currentOfficial.signature_path;
      
      const picture_path = pictureFile
        ? `/uploads/pictures/${pictureFile.filename}`
        : currentOfficial.picture_path;

      await query(
        `UPDATE officials
         SET full_name = ?, position = ?, order_no = ?,
             is_captain = ?, is_secretary = ?, signature_path = ?, picture_path = ?
         WHERE id = ?`,
        [
          full_name,
          position,
          order_no || 0,
          is_captain === '1' ? 1 : 0,
          is_secretary === '1' ? 1 : 0,
          signature_path,
          picture_path,
          id,
        ]
      );

      const updated = await query('SELECT * FROM officials WHERE id = ?', [
        id,
      ]);
      
      // Log the action
      await createHistoryLog(req, `updated official: ${full_name} (${position})`);

      res.json(updated[0]);
    } catch (err) {
      console.error('Error updating official:', err);
      res.status(500).json({ message: 'Error updating official' });
    }
  }
);

// DELETE /api/officials/:id (protected)
app.delete('/api/officials/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get official info before deleting for logging
    const officials = await query('SELECT full_name, position FROM officials WHERE id = ?', [id]);
    const official = officials[0];
    
    await query('DELETE FROM officials WHERE id = ?', [id]);
    
    // Log the action
    if (official) {
      await createHistoryLog(req, `deleted official: ${official.full_name} (${official.position})`);
    } else {
      await createHistoryLog(req, `deleted official #${id}`);
    }
    
    res.json({ message: 'Official deleted successfully' });
  } catch (err) {
    console.error('Error deleting official:', err);
    res.status(500).json({ message: 'Error deleting official' });
  }
});




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
