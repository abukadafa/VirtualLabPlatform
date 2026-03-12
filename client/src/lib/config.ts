export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : `http://${window.location.hostname}:5000`);

export const AWS_LAUNCH_URL = "https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Faws.amazon.com%2Fmarketplace%2Fmanagement%2Fsignin%3Fref_%3Dfooter_nav_management_portal%26state%3DhashArgs%2523%26isauthcode%3Dtrue&client_id=arn%3Aaws%3Aiam%3A%3A015428540659%3Auser%2Faws-mp-seller-management-portal&forceMobileApp=0&code_challenge=AKliKFJDumufeOsmC4vrYw4cuxj2Req2LKiDvN0lCpI&code_challenge_method=SHA-256";

export const NOUN_ELEARN_URL = "https://elearn.nou.edu.ng/login/index.php";
