import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lab from '../models/Lab.model';
import User from '../models/User.model';
import AcademicEvent from '../models/AcademicEvent.model';
import Course from '../models/Course.model';

dotenv.config();

const adminUser = {
    name: 'Admin User',
    username: 'admin',
    email: 'admin@virtuallab.com',
    password: 'adminpassword123',
    role: 'admin',
    programmes: ['MSc Management Information System'],
    status: 'enrolled',
};

const facilitators = [
    {
        name: 'Dr. John Smith',
        username: 'jsmith',
        email: 'jsmith@acetel.edu',
        password: 'facilitatorpass123',
        role: 'facilitator',
        programmes: ['MSc Artificial Intelligence', 'PhD Artificial Intelligence'],
        status: 'enrolled',
    },
    {
        name: 'Dr. Jane Doe',
        username: 'jdoe',
        email: 'jdoe@acetel.edu',
        password: 'facilitatorpass123',
        role: 'facilitator',
        programmes: ['MSc Cybersecurity', 'PhD Cybersecurity'],
        status: 'enrolled',
    },
    {
        name: 'Prof. Mike Ross',
        username: 'mross',
        email: 'mross@acetel.edu',
        password: 'facilitatorpass123',
        role: 'facilitator',
        programmes: ['MSc Management Information System', 'PhD Management Information System'],
        status: 'enrolled',
    },
];

const shortCourses = [
    { title: 'Intro to AI Systems', duration: '4 Weeks', studentsCount: 15, status: 'Active' },
    { title: 'Network Security Essentials', duration: '6 Weeks', studentsCount: 20, status: 'Active' },
    { title: 'Data Governance for Managers', duration: '5 Weeks', studentsCount: 12, status: 'Active' },
];

const academicEvents = [
    { name: 'AI ethics Symposium', type: 'Conference', date: new Date('2026-05-15'), location: 'Main Hall', description: 'Exploring the ethical implications of AI.' },
    { name: 'Cyber Warfare Workshop', type: 'Workshop', date: new Date('2026-06-20'), location: 'Cyber Lab', description: 'Hands-on training on cyber defense.' },
    { name: 'MIS Innovation Summit', type: 'Conference', date: new Date('2026-07-10'), location: 'Webinar', description: 'Future trends in Information Systems.' },
];

const labs = [

    {
        name: 'Artificial Intelligence Lab',
        type: 'AI',
        description: 'Advanced AI and Machine Learning laboratory with pre-configured environments for deep learning, NLP, and computer vision',
        software: [
            'Anaconda',
            'Jupyter Notebook',
            'TensorFlow',
            'PyTorch',
            'Keras',
            'Scikit-learn',
            'WEKA',
            'MATLAB',
            'RapidMiner',
            'Orange Data Mining',
            'H2O.ai',
            'OpenCV',
            'NLTK',
            'SpaCy',
        ],
        capacity: 50,
        status: 'active',
    },
    {
        name: 'Cybersecurity Lab',
        type: 'Cybersecurity',
        description: 'Hands-on cybersecurity environment for ethical hacking, penetration testing, and security analysis',
        software: [
            'Wireshark',
            'Kali Linux',
            'Metasploit',
            'Nmap',
            'Burp Suite',
            'OWASP ZAP',
            'Snort',
            'Splunk',
            'pfSense',
            'OpenSSL',
            'GnuPG',
            'Nessus',
            'OpenVAS',
            'Autopsy',
            'John the Ripper',
            'Hashcat',
            'GNS3',
        ],
        capacity: 40,
        status: 'active',
    },
    {
        name: 'Management Information System Lab',
        type: 'MIS',
        description: 'Laboratory for database management, enterprise systems, and information technology governance',
        software: [
            'Oracle Database',
            'Microsoft SQL Server',
            'SAP ERP',
            'Tableau',
            'Power BI',
            'Microsoft Access',
            'MySQL Workbench',
            'Project Management Software',
            'ERwin Data Modeler',
            'IBM SPSS',
        ],
        capacity: 45,
        status: 'active',
    },
];



const seedDatabase = async () => {
    /**
     * PRODUCTION GUARD: 
     * To prevent accidental data loss in production environments, 
     * seeding is disabled by default when NODE_ENV=production.
     * To bypass this, set ALLOW_PROD_SEED=true in your environment variables.
     */
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
        console.error('❌ CRITICAL: Seeding is disabled in production to prevent data loss.');
        console.error('To override, set ALLOW_PROD_SEED=true');
        process.exit(1);
    }

    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        // Clear existing labs, users, events, and courses
        await Lab.deleteMany({});
        await User.deleteMany({});
        await AcademicEvent.deleteMany({});
        await Course.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Insert new labs, users, and admin
        await Lab.insertMany(labs);
        await User.insertMany(facilitators);
        await new User(adminUser).save();
        await AcademicEvent.insertMany(academicEvents);
        
        // Seed courses as short courses (mocking them as Courses for now)
        // In a real scenario, you'd link them to facilitators
        const firstFacilitator = await User.findOne({ role: 'facilitator' });
        if (firstFacilitator) {
            const coursesToSeed = shortCourses.map(c => ({
                code: c.title.split(' ').map(w => w[0]).join('').toUpperCase() + '101',
                name: c.title,
                department: 'ACETEL',
                facilitator: firstFacilitator._id
            }));
            await Course.insertMany(coursesToSeed);
        }

        console.log('✅ Seeded ACETEL data successfully');


        console.log('\n📊 Lab Summary:');
        labs.forEach((lab, index) => {
            console.log(`${index + 1}. ${lab.name} (${lab.type}) - ${lab.software.length} software packages`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
