import * as fs from 'fs';
try {
    const data = fs.readFileSync('.env', 'utf8');
    console.log(data);
} catch (e) {
    console.error(e);
}
