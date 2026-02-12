import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lab from '../models/Lab.model';
import User from '../models/User.model';

dotenv.config();

const adminUser = {
    name: 'Admin User',
    username: 'admin',
    email: 'admin@virtuallab.com',
    password: 'adminpassword123',
    role: 'admin',
    programme: 'Management Information System',
    status: 'enrolled',
};

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
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        // Clear existing labs and users
        await Lab.deleteMany({});
        await User.deleteMany({});
        console.log('🗑️  Cleared existing labs and users');

        // Insert new labs and admin user
        await Lab.insertMany(labs);
        await new User(adminUser).save();
        console.log('✅ Seeded labs and admin user successfully');


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
