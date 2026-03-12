
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const testLogin = async () => {
    try {
        console.log('Attempting login as admin...');
        const response = await axios.post(`${API_URL}/auth/login`, {
            identifier: 'admin',
            password: 'adminpassword123',
            role: 'admin'
        });
        console.log('Login successful:', response.data.token ? 'Token received' : 'No token');
    } catch (error: any) {
        if (error.response) {
            console.error('Login failed:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testLogin();
