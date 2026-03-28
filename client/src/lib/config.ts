export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : `http://${window.location.hostname}:5000`);

export const WS_URL = import.meta.env.VITE_WS_URL || (() => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.PROD ? window.location.host : `${window.location.hostname}:5000`;
    return `${protocol}//${host}`;
})();

export const AWS_LAUNCH_URL = "https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fus-east-1.console.aws.amazon.com%2Fiam%3Fca-oauth-flow-id%3D7435%26hashArgs%3D%2523%26isauthcode%3Dtrue%26oauthStart%3D1774281854022%26region%3Dus-east-1%26state%3DhashArgsFromTB_us-east-1_324550b0beb3c843&client_id=arn%3Aaws%3Asignin%3A%3A%3Aconsole%2Fiamv2&forceMobileApp=0&code_challenge=mZlW1J4ev-h_fFZ3MpI17WZZ0vd_9V_hUxZ6vGVnUtY&code_challenge_method=SHA-256";

export const NOUN_ELEARN_URL = "https://elearn.nou.edu.ng/login/index.php";
