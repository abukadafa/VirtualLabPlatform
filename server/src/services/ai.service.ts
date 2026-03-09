import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAuditLog } from '../models/AuditLog.model';

class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-1.5-flash for fast and efficient log analysis
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Analyze a set of audit logs for patterns, security risks, and student behavior
     */
    async analyzeAuditLogs(logs: IAuditLog[]): Promise<string> {
        if (!process.env.GEMINI_API_KEY) {
            return "AI Analysis is not configured. Please set GEMINI_API_KEY in your environment.";
        }

        if (logs.length === 0) {
            return "No logs provided for analysis.";
        }

        // Format logs for the AI to process efficiently
        const formattedLogs = logs.map(log => ({
            time: log.createdAt,
            user: (log as any).userId?.name || 'System',
            event: log.eventType,
            msg: log.message,
            severity: log.severity,
            data: JSON.stringify(log.eventData)
        }));

        const prompt = `
            You are a Senior Security Operations Center (SOC) Analyst for a Virtual Lab Platform.
            Your task is to analyze the following system audit logs and provide a concise executive summary for administrators.

            LOG DATA (Last ${logs.length} events):
            ${JSON.stringify(formattedLogs, null, 2)}

            Please provide your analysis in the following Markdown format:
            ### 🚨 Security Insights
            (Identify any suspicious patterns, multiple failed logins, or potential abuse)

            ### 🎓 Student Behavior & Lab Usage
            (Summarize how students are interacting with the labs. Are there common errors? High activity periods?)

            ### 📈 Performance & System Health
            (Note any system-level warnings or resource issues)

            ### 💡 Recommendations
            (Actionable steps for the administrator)

            Keep the tone professional and focus on critical anomalies. If no issues are found, state that the system appears healthy.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error('AI Analysis Error:', error);
            return `Failed to analyze logs with AI: ${error.message}`;
        }
    }

    /**
     * Analyze a specific user's activity logs
     */
    async analyzeUserActivity(userName: string, logs: IAuditLog[]): Promise<string> {
        if (!process.env.GEMINI_API_KEY) {
            return "AI Analysis is not configured.";
        }

        if (logs.length === 0) {
            return `No activity logs found for user: ${userName}`;
        }

        const formattedLogs = logs.map(log => ({
            time: log.createdAt,
            event: log.eventType,
            msg: log.message,
            severity: log.severity,
            data: log.eventData
        }));

        const prompt = `
            You are an Academic Advisor and Security Auditor.
            Analyze the activity logs for the student: "${userName}".
            
            USER LOG DATA:
            ${JSON.stringify(formattedLogs, null, 2)}

            Please provide a concise student profile in Markdown:
            ### 👤 Student Engagement Profile
            (How active is the student? What times do they usually work?)

            ### 💻 Lab Performance & Skills
            (Which labs do they use most? Are there repeated command errors or successful completions?)

            ### 🛡️ Security & Integrity Assessment
            (Any suspicious behavior, login anomalies, or violations?)

            ### 📝 Summary Recommendation
            (A 2-sentence summary of this student's progress and any concerns)
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error('User AI Analysis Error:', error);
            return `Failed to analyze user activity: ${error.message}`;
        }
    }
}

export default new AIService();
