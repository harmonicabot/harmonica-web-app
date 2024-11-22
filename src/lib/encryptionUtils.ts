export function encryptId(input: string): string {
    let encoded = Buffer.from(input).toString('base64'); 
    return encoded;
}

export function decryptId(encoded: string): string {
    let decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return decoded; 
}