const fs = require('fs');
const path = 'c:/Users/user/Desktop/My first App/ACETEL NEW/client/src/pages/AcetelDashboard.tsx';
try {
    let content = fs.readFileSync(path, 'utf8');
    const searchStr = '} else if (listType === "Facilitators") {';
    
    // Use a very simple string search first
    const index = content.indexOf(searchStr);
    if (index !== -1) {
        console.log('Found string at index', index);
        const replacement = `} else if (listType === "Supervisors") {
              const newSups = data.map(row => ({
                id: row["ID"] || Date.now() + Math.random(),
                name: row["Name"] || "Unknown",
                dept: row["Department"] || row["Discipline"] || "N/A",
                expertise: row["Expertise"] || "N/A",
                email: row["Email"] || "N/A",
                status: row["Status"] || "Active",
                current: 0,
                max: 10,
                load: 0
              }));
              setSupervisors(prev => [...newSups, ...prev]);
              alert(\`Imported \${newSups.length} supervisors.\`);
            } else if (listType === "Facilitators") {`;
        const newContent = content.substring(0, index) + replacement + content.substring(index + searchStr.length);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Successfully replaced');
    } else {
        console.log('Search string not found');
        // Let's print some lines around where it should be
        console.log('Searching for parts of the string...');
        if (content.includes('listType === "Facilitators"')) {
            console.log('Found "listType === Facilitators", but full line match failed.');
        }
    }
} catch (err) {
    console.error('Error:', err.message);
}
