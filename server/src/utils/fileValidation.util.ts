import path from 'path';

/**
 * Validates if the given MIME type matches the file extension.
 * Helps prevent MIME-sniffing based attacks.
 */
const EXTENSION_MIME_MAP: Record<string, string[]> = {
    '.pdf': ['application/pdf'],
    '.zip': ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.doc': ['application/msword'],
    '.py': ['text/x-python', 'application/x-python-code', 'text/plain'],
    '.ipynb': ['application/x-ipynb+json', 'application/json', 'text/plain'],
    '.txt': ['text/plain'],
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg']
};

export const sanitizeFilename = (filename: string): string => {
    // 1. Get basename to prevent path traversal
    const base = path.basename(filename);

    // 2. Remove all non-alphanumeric (except . - _)
    // We keep the last dot for extension
    const ext = path.extname(base);
    const nameWithoutExt = path.basename(base, ext);

    const sanitizedBase = nameWithoutExt
        .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace malicious chars with underscore
        .substring(0, 100); // Limit length

    return sanitizedBase + ext.toLowerCase();
};

export const isValidMimeType = (filename: string, mimeType: string): boolean => {
    const ext = path.extname(filename).toLowerCase();
    const allowedMimes = EXTENSION_MIME_MAP[ext];

    if (!allowedMimes) return false;
    return allowedMimes.includes(mimeType);
};
