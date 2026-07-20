import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 🛢️ MySQL Connection Setup
// (குறிப்பு: உங்க MySQL Password 'your_password'-க்கு பதிலா உங்க நிஜ பாஸ்வேர்டை இங்க போடுங்க)
const db = mysql.createConnection({
  host: 'localhost',      
  user: 'root',           
  password: 'srikanth$123', 
  database: 'academic_db' 
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed ❌:', err.message);
  } else {
    console.log('MySQL Connected Successfully! 🚀');
  }
});

// 1. Get Students & Marks Data API (Based on Dept, Year & Subject)
app.get('/api/students', (req, res) => {
  const { dept, year, subject } = req.query;

  // React அனுப்பும் Dept, Year, Subject-க்கு ஏத்த மாதிரி பில்டர் பண்றோம்
  let sql = `
    SELECT s.reg_no AS id, s.name, 
           m.cia1, m.assign1, m.seminar1, m.cia2, m.model, m.assign2, m.seminar2
    FROM students s
    LEFT JOIN marks m ON s.reg_no = m.roll_no AND m.subject_code = ?
  `;
  
  let params = [subject];

  if (dept && year) {
    sql += ` WHERE s.department = ? AND s.year = ?`;
    params.push(dept, year);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Fetch Error:", err);
      return res.status(500).json({ error: err.message });
    }
    return res.json(results);
  });
});

// 2. Add Student API
app.post('/api/add-student', (req, res) => {
  const { regNo, name, dept, year } = req.body;
  const sql = "INSERT INTO students (reg_no, name, department, year) VALUES (?, ?, ?, ?)";
  
  db.query(sql, [regNo, name, dept, year], (err, result) => {
    if (err) {
      console.error("Add Student Error:", err);
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: "Student added successfully!" });
  });
});

// 3. Save Marks API (Bulk Save from React Grid)
app.post('/api/save-marks', (req, res) => {
  const { subject, studentsMarks } = req.body;

  if (!studentsMarks || studentsMarks.length === 0) {
    return res.status(400).json({ message: "No data received" });
  }

  // பல மாணவர்களின் மார்க்ஸை ஒரே நேரத்தில் Save/Update செய்ய Loop பண்றோம்
  let completed = 0;
  let hasError = false;

  studentsMarks.forEach(student => {
    const sql = `
      INSERT INTO marks (roll_no, subject_code, cia1, assign1, seminar1, cia2, model, assign2, seminar2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      cia1=VALUES(cia1), assign1=VALUES(assign1), seminar1=VALUES(seminar1), 
      cia2=VALUES(cia2), model=VALUES(model), assign2=VALUES(assign2), seminar2=VALUES(seminar2)
    `;

    const values = [
      student.id,
      subject || "GEN101",
      student.cia1 || 0,
      student.assign1 || 0,
      student.seminar1 || 0,
      student.cia2 || 0,
      student.model || 0,
      student.assign2 || 0,
      student.seminar2 || 0
    ];

    db.query(sql, values, (err, result) => {
      if (err && !hasError) {
        hasError = true;
        console.error("Save Marks Error:", err);
        return res.status(500).json({ error: err.message });
      }

      completed++;
      if (completed === studentsMarks.length && !hasError) {
        return res.json({ message: "All marks saved successfully to MySQL!" });
      }
    });
  });
});

app.listen(5000, () => {
  console.log('Server running on port 5000 🎯');
});