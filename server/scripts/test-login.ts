import axios from 'axios';

const testLogin = async () => {
    const API_URL = 'http://localhost:5000/api';
    try {
        console.log('Testing with lowercase absteve...');
        const res1 = await axios.post(`${API_URL}/auth/login`, {
            identifier: 'absteve',
            password: 'Absteve'
        });
        console.log('Login success (lowercase):', res1.data.user.username);
    } catch (err: any) {
        console.log('Login failed (lowercase):', err.response?.data?.message || err.message);
    }

    try {
        console.log('\nTesting with exact Absteve...');
        const res2 = await axios.post(`${API_URL}/auth/login`, {
            identifier: 'Absteve',
            password: 'Absteve'
        });
        console.log('Login success (Exact):', res2.data.user.username);
    } catch (err: any) {
        console.log('Login failed (Exact):', err.response?.data?.message || err.message);
    }
};

testLogin();
