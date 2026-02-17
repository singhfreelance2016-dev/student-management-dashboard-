// [EXTERNAL — INSTALL REQUIRED] Express - Web framework for Node.js
const express = require('express');
// [EXTERNAL — INSTALL REQUIRED] MongoDB Node Driver - Official MongoDB driver
const { MongoClient, ObjectId } = require('mongodb');
// [EXTERNAL — INSTALL REQUIRED] CORS - Cross-Origin Resource Sharing middleware
const cors = require('cors');
// [EXTERNAL — INSTALL REQUIRED] Dotenv - Loads environment variables from .env file
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS for GitHub Pages frontend
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://yourusername.github.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===== DATABASE CONNECTION =====
// [EXTERNAL — CONFIGURE VALUE] MongoDB Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'student_management';
const COLLECTION_NAME = 'students';

let db;
let client;

async function connectToDatabase() {
    try {
        // Configure MongoDB connection options for production
        client = new MongoClient(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Connection pool size
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        
        await client.connect();
        console.log('✅ Successfully connected to MongoDB Atlas');
        
        db = client.db(DB_NAME);
        
        // Create indexes for better query performance
        await db.collection(COLLECTION_NAME).createIndexes([
            { key: { name: 1 } },
            { key: { email: 1 }, unique: true },
            { key: { course: 1 } },
            { key: { feeStatus: 1 } },
            { key: { joinDate: -1 } }
        ]);
        
        console.log('✅ Database indexes created');
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ===== VALIDATION FUNCTIONS =====
function validateStudent(data) {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!data.email || typeof data.email !== 'string') {
        errors.push('Email is required');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.push('Invalid email format');
        }
    }
    
    if (data.phone) {
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        if (!phoneRegex.test(data.phone)) {
            errors.push('Invalid phone number format');
        }
    }
    
    if (!data.course || typeof data.course !== 'string' || data.course.trim().length < 2) {
        errors.push('Course/Service is required and must be at least 2 characters');
    }
    
    const validStatuses = ['Paid', 'Pending', 'Partial', 'Scholarship'];
    if (!data.feeStatus || !validStatuses.includes(data.feeStatus)) {
        errors.push('Valid fee status is required');
    }
    
    if (!data.joinDate) {
        errors.push('Join date is required');
    } else {
        const date = new Date(data.joinDate);
        if (isNaN(date.getTime())) {
            errors.push('Invalid join date format');
        }
    }
    
    if (data.notes && typeof data.notes !== 'string') {
        errors.push('Notes must be text');
    }
    
    return errors;
}

// ===== HEALTH CHECK ENDPOINT =====
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// ===== API ENDPOINTS =====

// POST /records - Create a new student record
app.post('/api/records', async (req, res) => {
    try {
        console.log('Creating new record:', req.body);
        
        // Validate input
        const errors = validateStudent(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        
        // Prepare document
        const student = {
            name: req.body.name.trim(),
            email: req.body.email.trim().toLowerCase(),
            phone: req.body.phone?.trim() || '',
            course: req.body.course.trim(),
            feeStatus: req.body.feeStatus,
            joinDate: new Date(req.body.joinDate),
            notes: req.body.notes?.trim() || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Check for duplicate email
        const existingStudent = await db.collection(COLLECTION_NAME).findOne({ email: student.email });
        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: 'A student with this email already exists'
            });
        }
        
        // Insert into database
        const result = await db.collection(COLLECTION_NAME).insertOne(student);
        
        // Return success response
        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: {
                _id: result.insertedId,
                ...student
            }
        });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /records - Retrieve all student records
app.get('/api/records', async (req, res) => {
    try {
        const { search, status, sortBy = 'joinDate', sortOrder = 'desc' } = req.query;
        
        // Build query filter
        const filter = {};
        
        if (status) {
            filter.feeStatus = status;
        }
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { course: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Build sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Fetch records
        const students = await db.collection(COLLECTION_NAME)
            .find(filter)
            .sort(sortOptions)
            .toArray();
        
        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /records/:id - Retrieve a single student record
app.get('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }
        
        // Find student
        const student = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /records/:id - Update a student record
app.put('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }
        
        // Validate input
        const errors = validateStudent(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        
        // Prepare update
        const updateData = {
            name: req.body.name.trim(),
            email: req.body.email.trim().toLowerCase(),
            phone: req.body.phone?.trim() || '',
            course: req.body.course.trim(),
            feeStatus: req.body.feeStatus,
            joinDate: new Date(req.body.joinDate),
            notes: req.body.notes?.trim() || '',
            updatedAt: new Date()
        };
        
        // Check email uniqueness (excluding current document)
        const existingStudent = await db.collection(COLLECTION_NAME).findOne({
            email: updateData.email,
            _id: { $ne: new ObjectId(id) }
        });
        
        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: 'A student with this email already exists'
            });
        }
        
        // Update document
        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Fetch updated document
        const updatedStudent = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
        
        res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            data: updatedStudent
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /records/:id - Delete a student record
app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }
        
        // Delete document
        const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ===== ERROR HANDLING MIDDLEWARE =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===== START SERVER =====
async function startServer() {
    try {
        // Connect to database first
        await connectToDatabase();
        
        // Then start the server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 API available at http://localhost:${PORT}/api`);
            console.log(`💚 Health check at http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit(0);
});

// Start the server
startServer();