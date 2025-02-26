const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = 3000;
const hostname = '127.0.0.1';

// เชื่อมต่อฐานข้อมูล
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'depression_tracking_db'
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

app.get('/', (req, res) => {
    res.json({
        "Name": "Mini project",
        "Author": "Charoenporn Bouyam",
        "APIs": [
            {"api_name": "/getusers/", "method": "GET"},
            {"api_name": "/getusers/:id", "method": "GET"},
            {"api_name": "/addusers", "method": "POST"},
            {"api_name": "/editusers", "method": "PUT"},
            {"api_name": "/deleteusers", "method": "DELETE"},
            {"api_name": "/getappointments/", "method": "GET"},
            {"api_name": "/getdaily/", "method": "GET"},
            {"api_name": "/getrecommendations/", "method": "GET"}
        ]
    });
});

app.post('/login', (req, res) => {
    let sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    let values = [req.body.email, req.body.password];

    connection.query(sql, values, (err, results) => {
        if (err) {
            res.json({ error: true, msg: "Error checking login", details: err });
        } else if (results.length > 0) {
            res.json({
                error: false,
                msg: "Login successful",
                user: results[0], 
            });
        } else {
            res.json({ error: true, msg: "Invalid email or password" });
        }
    });
});

app.post('/saveDailyRecord', (req, res) => {
    const { patient_id, mood, medication_taken } = req.body;
    
    console.log("ได้รับข้อมูล:", req.body); 

    // ใส่วันที่ปัจจุบันโดยอัตโนมัติ
    const record_date = new Date().toISOString().split('T')[0]; 

    const query = "INSERT INTO daily_records (patient_id, record_date, mood, medication_taken) VALUES (?, ?, ?, ?)";
    connection.query(query, [patient_id, record_date, mood, medication_taken], (err, results) => {
        if (err) {
            console.error("เกิดข้อผิดพลาด:", err);
            res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
        } else {
            console.log("บันทึกสำเร็จ!", results);
            res.json({ success: true, message: "บันทึกข้อมูลเรียบร้อย!" });
        }
    });
});


//ผู้ใช้งานusers
app.get('/getusers/', (req, res) => {
    let sql = 'SELECT * FROM users';
    connection.query(sql, (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});
app.get('/getusers/:id', (req, res) => {
    let sql = 'SELECT * FROM users WHERE user_id = ?';
    connection.query(sql, [req.params.id], (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});
app.post('/addusers', (req, res) => {
    let sql = 'INSERT INTO users(name, email, password, role) VALUES (?, ?, ?, ?)';
    let values = [req.body.user_name, req.body.users_email, req.body.password, req.body.role];

    connection.query(sql, values, (err, results) => {
        if (err) res.json({ error: true, msg: "Cannot Insert", details: err });
        else res.json({ error: false, data: results, msg: "Inserted" });
    });
});
app.put('/editusers', (req, res) => {
    let sql = 'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE user_id = ?';
    let values = [req.body.user_name, req.body.users_email, req.body.password, req.body.role, req.body.user_id];

    connection.query(sql, values, (err, results) => {
        let message = err ? "Cannot Edit" : "Updated";
        res.json({ error: !!err, data: results, msg: message });
    });
});
app.delete('/deleteusers', (req, res) => {
    let sql = 'UPDATE users SET status = "inactive" WHERE user_id = ?';
    let values = [req.body.user_id];

    connection.query(sql, values, (err, results) => {
        let message = err ? "Cannot Delete" : "Updated";
        res.json({ error: !!err, data: results, msg: message });
    });
});

app.get('/getdoctors/', (req, res) => {
    let sql = 'SELECT user_id, name FROM users WHERE role = "doctor"';
    connection.query(sql, (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});


// โหลดข้อมูลนัดหมายทั้งหมด 
app.get('/getappointments/', (req, res) => {
    let sql = `
        SELECT 
            appointments.appointment_id, 
            appointments.appointment_date, 
            appointments.status, 
            patient.name AS patient_name, 
            doctor.name AS doctor_name
        FROM appointments
        JOIN users AS patient ON appointments.patient_id = patient.user_id
        JOIN users AS doctor ON appointments.doctor_id = doctor.user_id
    `;

    connection.query(sql, (err, results) => {
        if (err) res.json({ error: true, msg: "Error fetching appointments", details: err });
        else res.json(results);
    });
});

// ดึงข้อมูลนัดหมายของผู้ป่วยตาม `patient_id`
app.get('/getappointments/:patient_id', (req, res) => {
    const { patient_id } = req.params;
    
    if (!patient_id) return res.json({ error: true, msg: "Missing patient_id" });

    let sql = `
        SELECT 
            appointments.appointment_id, 
            appointments.appointment_date, 
            appointments.status, 
            doctor.name AS doctor_name
        FROM appointments
        JOIN users AS doctor ON appointments.doctor_id = doctor.user_id
        WHERE appointments.patient_id = ?
    `;
    connection.query(sql, [patient_id], (err, results) => {
        if (err) res.json({ error: true, msg: "Error fetching appointments", details: err });
        else res.json(results);
    });
});

// ดึงข้อมูลนัดหมายของแพทย์
app.get('/getappointments/doctor/:doctor_id', (req, res) => {
    const { doctor_id } = req.params;

    if (!doctor_id) return res.json({ error: true, msg: "Missing doctor_id" });

    let sql = `
        SELECT 
            appointments.appointment_id, 
            appointments.appointment_date, 
            appointments.status, 
            patient.name AS patient_name
        FROM appointments
        JOIN users AS patient ON appointments.patient_id = patient.user_id
        WHERE appointments.doctor_id = ?  -- กรองตาม doctor_id
        ORDER BY appointments.appointment_date;  -- เรียงตามวันที่นัดหมาย
    `;
    
    connection.query(sql, [doctor_id], (err, results) => {
        if (err) {
            console.error(err);
            res.json({ error: true, msg: "Error fetching doctor appointments", details: err });
        } else if (results.length === 0) {
            res.json({ error: false, msg: "No appointments found for this doctor" });
        } else {
            res.json(results);  // ส่งผลลัพธ์การค้นหากลับไป
        }
    });
});

// เพิ่มนัดหมายใหม่
app.post('/addappointments', (req, res) => {
    const { patient_id, doctor_id, appointment_date, status } = req.body;
    
    if (!patient_id || !doctor_id || !appointment_date || !status) {
        return res.json({ error: true, msg: "Missing required fields" });
    }

    // ตรวจสอบว่า `doctor_id` มีอยู่ในระบบจริงหรือไม่
    let checkDoctorSql = 'SELECT * FROM users WHERE user_id = ? AND role = "doctor"';
    let insertSql = 'INSERT INTO appointments (patient_id, doctor_id, appointment_date, status) VALUES (?, ?, ?, ?)';
    let values = [patient_id, doctor_id, appointment_date, status];

    connection.query(checkDoctorSql, [doctor_id], (err, results) => {
        if (err) {
            res.json({ error: true, msg: "Database error", details: err });
        } else if (results.length === 0) {
            res.json({ error: true, msg: "Invalid doctor ID" });
        } else {
            connection.query(insertSql, values, (err, results) => {
                if (err) res.json({ error: true, msg: "Cannot Insert", details: err });
                else res.json({ error: false, data: results, msg: "Appointment added successfully" });
            });
        }
    });
});

// บันทึกการนัดหมาย (ใช้ `patient_id` จาก body)
app.post('/saveAppointment', (req, res) => {
    const { patient_id, doctor_id, appointment_date } = req.body;

    if (!patient_id || !doctor_id || !appointment_date) {
        return res.json({ success: false, message: "Missing required fields" });
    }

    const query = `
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, status)
        VALUES (?, ?, ?, 'pending')
    `;

    connection.query(query, [patient_id, doctor_id, appointment_date], (err, results) => {
        if (err) {
            console.error("Error saving appointment:", err);
            return res.json({ success: false, message: "Cannot save appointment", details: err });
        } else {
            res.json({ success: true, message: "Appointment saved successfully" });
        }
    });
});

// แก้ไขข้อมูลนัดหมาย
app.put('/editappointments', (req, res) => {
    const { patient_id, doctor_id, appointment_date, status, appointment_id } = req.body;

    if (!patient_id || !doctor_id || !appointment_date || !status || !appointment_id) {
        return res.json({ error: true, msg: "Missing required fields" });
    }

    let sql = 'UPDATE appointments SET patient_id = ?, doctor_id = ?, appointment_date = ?, status = ? WHERE appointment_id = ?';
    let values = [patient_id, doctor_id, appointment_date, status, appointment_id];

    connection.query(sql, values, (err, results) => {
        if (err) {
            res.json({ error: true, msg: "Cannot Edit", details: err });
        } else {
            res.json({ error: false, data: results, msg: "Appointment updated successfully" });
        }
    });
});

// ลบนัดหมายโดยใช้ `appointment_id`
app.delete('/deleteappointments/:appointment_id', (req, res) => {
    const { appointment_id } = req.params;

    if (!appointment_id) return res.json({ error: true, msg: "Missing appointment_id" });

    let sql = 'DELETE FROM appointments WHERE appointment_id = ?';

    connection.query(sql, [appointment_id], (err, results) => {
        if (err) res.json({ error: true, msg: "Cannot delete appointment", details: err });
        else res.json({ error: false, data: results, msg: "Appointment deleted successfully" });
    });
});

// อัพเดตสถานะการนัดหมาย
app.put('/updateappointmentstatus/:appointment_id', (req, res) => {
    const { appointment_id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.json({ error: true, msg: "Missing status" });
    }

    let sql = 'UPDATE appointments SET status = ? WHERE appointment_id = ?';
    connection.query(sql, [status, appointment_id], (err, results) => {
        if (err) {
            res.json({ error: true, msg: "Cannot update status", details: err });
        } else {
            res.json({ error: false, msg: "Appointment status updated successfully" });
        }
    });
});


//อารมณ์daily
app.get('/getdaily/', (req, res) => {
    let sql = 'SELECT * FROM daily_records';
    connection.query(sql, (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});
app.get('/getdaily/:id', (req, res) => {
    let sql = 'SELECT * FROM daily_records WHERE patient_id = ?';
    connection.query(sql, [req.params.id], (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});
app.post('/adddaily', (req, res) => {
    let sql = 'INSERT INTO daily_records(record_id, patient_id, record_date, mood) VALUES (?, ?, ?, ?)';
    let values = [req.body.record_id, req.body.patient_id, req.body.record_date, req.body.mood];

    connection.query(sql, values, (err, results) => {
        if (err) res.json({ error: true, msg: "Cannot Insert", details: err });
        else res.json({ error: false, data: results, msg: "Inserted" });
    });
});
app.put('/editdaily', (req, res) => {
    let sql = 'UPDATE daily_records SET mood = ?, note = ?, record_date = ? WHERE record_id = ?';
    let values = [req.body.mood, req.body.note, req.body.record_date, req.body.record_id];

    connection.query(sql, values, (err, results) => {
        let message = err ? "Cannot Edit" : "Updated";
        res.json({ error: !!err, data: results, msg: message });
    });
});
app.delete('/deletedaily', (req, res) => {
    let sql = 'UPDATE daily_records SET status = "inactive" WHERE record_id = ?';
    let values = [req.body.daily_id];

    connection.query(sql, values, (err, results) => {
        let message = err ? "Cannot Delete" : "Updated";
        res.json({ error: !!err, data: results, msg: message });
    });
});

app.get('/getrecommendations/', (req, res) => {
    let sql = 'SELECT * FROM recommendations';
    connection.query(sql, (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});
app.get('/getrecommendations/:id', (req, res) => {
    let sql = 'SELECT * FROM recommendations WHERE patient_id = ?';
    connection.query(sql, [req.params.id], (err, results) => {
        if (err) res.json({ error: true, msg: err });
        else res.json(results);
    });
});
app.post('/addrecommendations', (req, res) => {
    let sql = 'INSERT INTO recommendations(patient_id, doctor_id, recommendation) VALUES (?, ?, ?)';
    let values = [req.body.patient_id, req.body.doctor_id, req.body.recommendation];

    connection.query(sql, values, (err, results) => {
        if (err) res.json({ error: true, msg: "Cannot Insert", details: err });
        else res.json({ error: false, data: results, msg: "Inserted" });
    });
});
app.put('/editrecommendations', (req, res) => {
    let sql = 'UPDATE recommendations SET recommendation = ? WHERE recommendation_id = ?';
    let values = [req.body.recommendation, req.body.recommendation_id];

    connection.query(sql, values, (err, results) => {
        let message = err ? "Cannot Edit" : "Updated";
        res.json({ error: !!err, data: results, msg: message });
    });
});
app.delete('/deleterecommendations', (req, res) => {
    let sql = 'UPDATE recommendations SET status = "inactive" WHERE recommendation_id = ?';
    let values = [req.body.recommendation_id];

    connection.query(sql, values, (err, results) => {
        let message = err ? "Cannot Delete" : "Updated";
        res.json({ error: !!err, data: results, msg: message });
    });
});
//พึ่งเพิ่มล่าสุด
app.put('/updaterecommendation/:id', (req, res) => {
    let sql = 'UPDATE recommendations SET recommendation = ? WHERE patient_id = ?';
    let values = [req.body.recommendation, req.params.id];

    connection.query(sql, values, (err, results) => {
        if (err) res.json({ error: true, msg: "Cannot Update", details: err });
        else res.json({ error: false, data: results, msg: "Updated" });
    });
});

app.get('/getlatestadvice/:id', (req, res) => {
    const patientId = req.params.id;
    console.log("Received patientId:", patientId);  // ดูว่ารับ patient_id ที่ถูกต้อง

    let sql = 'SELECT recommendation FROM recommendations WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1';
    
    connection.query(sql, [patientId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, msg: "Database error", details: err });
        } else if (results.length === 0) {
            return res.status(404).json({ error: false, advice: null });
        } else {
            console.log("Fetched advice:", results[0].recommendation);  // ตรวจสอบคำแนะนำที่ดึงมาจากฐานข้อมูล
            return res.status(200).json({ error: false, advice: results[0].recommendation });
        }
    });
});




