export function encryptId(input: string): string {
    let encoded = Buffer.from(input).toString('base64'); 
    return encoded;
}

export function decryptId(encoded: string): string {
    // Decode URL-encoded string
    let decodedUrl = decodeURIComponent(encoded);
    let decoded = Buffer.from(decodedUrl, 'base64').toString('utf-8');
    return decoded; 
}