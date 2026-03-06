import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lab from '../models/Lab.model';
import User from '../models/User.model';

dotenv.config();

const labs = [
    {
        name: 'Artificial Intelligence Lab',
        type: 'AI',
        description: 'Advanced AI and Machine Learning laboratory with pre-configured environments for deep learning, NLP, and computer vision',
        software: [
            'Python 3',
            'Jupyter Lab',
            'TensorFlow (CPU)',
            'PyTorch (CPU)',
            'Keras',
            'Scikit-learn',
            'OpenCV',
            'NLTK',
            'SpaCy',
            'H2O',
            'Transformers (Hugging Face)',
            'Matplotlib',
            'Seaborn',
            'Pandas',
            'NumPy'
        ],
        capacity: 50,
        status: 'active',
    },
    {
        name: 'Cybersecurity Lab',
        type: 'Cybersecurity',
        description: 'Hands-on cybersecurity environment for ethical hacking, penetration testing, and security analysis',
        software: [
            'Kali Linux (Rolling)',
            'Wireshark',
            'Metasploit Framework',
            'Nmap',
            'Burp Suite',
            'OWASP ZAP',
            'Autopsy',
            'John the Ripper',
            'Hashcat',
            'Aircrack-ng',
            'Hydra',
            'Sqlmap',
            'Nikto',
            'Maltego',
            'Netcat'
        ],
        capacity: 40,
        status: 'active',
    },
    {
        name: 'Management Information System Lab',
        type: 'MIS',
        description: 'Laboratory for database management, business intelligence, and data analytics',
        software: [
            'PostgreSQL',
            'RStudio Desktop',
            'R Language',
            'Metabase (BI Tool)',
            'Jupyter Lab',
            'Python Data Stack',
            'LibreOffice',
            'Pandas',
            'Plotly',
            'Dash',
            'SQLAlchemy',
            'PyMySQL'
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

        // Idempotent Lab Seeding
        for (const labData of labs) {
            await Lab.findOneAndUpdate(
                { name: labData.name },
                labData,
                { upsert: true, new: true }
            );
        }
        console.log('✅ Seeded/Updated labs successfully');

        // Create Admin User
        const adminData = {
            name: 'Admin User',
            username: 'admin',
            email: 'admin@virtuallab.com',
            password: 'adminpassword123',
            role: 'admin' as const,
            programmes: ['Management Information System', 'Artificial Intelligence', 'Cybersecurity'],
            status: 'enrolled' as const,
        };

        const existingAdmin = await User.findOne({ 
            $or: [{ username: adminData.username }, { email: adminData.email }] 
        });

        if (existingAdmin) {
            existingAdmin.password = adminData.password;
            existingAdmin.role = adminData.role;
            existingAdmin.status = adminData.status;
            await existingAdmin.save();
            console.log('✅ Updated existing admin user');
        } else {
            const adminUser = new User(adminData);
            await adminUser.save();
            console.log('✅ Created new admin user: admin@virtuallab.com / adminpassword123');
        }

        // Create Facilitator User
        const facilitatorData = {
            name: 'Facilitator User',
            username: 'facilitator',
            email: 'facilitator@virtuallab.com',
            password: 'facilitatorpassword123',
            role: 'facilitator' as const,
            programmes: ['Artificial Intelligence', 'Cybersecurity'],
            status: 'enrolled' as const,
        };

        const existingFacilitator = await User.findOne({ 
            $or: [{ username: facilitatorData.username }, { email: facilitatorData.email }] 
        });

        if (existingFacilitator) {
            existingFacilitator.password = facilitatorData.password;
            existingFacilitator.role = facilitatorData.role;
            existingFacilitator.status = facilitatorData.status;
            await existingFacilitator.save();
            console.log('✅ Updated existing facilitator user');
        } else {
            const facilitatorUser = new User(facilitatorData);
            await facilitatorUser.save();
            console.log('✅ Created new facilitator user: facilitator@virtuallab.com / facilitatorpassword123');
        }

        // Create Test Student
        const studentData = {
            name: 'Student User',
            username: 'student',
            email: 'student@virtuallab.com',
            password: 'studentpassword123',
            role: 'student' as const,
            programmes: ['Artificial Intelligence'],
            status: 'enrolled' as const,
        };

        const existingStudent = await User.findOne({ 
            $or: [{ username: studentData.username }, { email: studentData.email }] 
        });

        if (!existingStudent) {
            const studentUser = new User(studentData);
            await studentUser.save();
            console.log('✅ Created new student user: student@virtuallab.com / studentpassword123');
        }

        console.log('\n📊 Lab Summary:');
        labs.forEach((lab, index) => {
            console.log(`${index + 1}. ${lab.name} (${lab.type})`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
