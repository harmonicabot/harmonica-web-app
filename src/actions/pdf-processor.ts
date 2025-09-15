'use server';

import PDFParser from 'pdf2json';

export async function extractTextFromPDF(pdfData: number[]): Promise<string> {
  try {
    const pdfParser = new PDFParser();
    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        // Get the raw PDF data
        const rawData = pdfParser.getRawTextContent();
        console.log('[i] Raw PDF data:', pdfData);

        // Try to extract text from pages
        let extractedText = '';
        if (pdfData && pdfData.Pages) {
          pdfData.Pages.forEach((page: any) => {
            if (page.Texts) {
              page.Texts.forEach((text: any) => {
                if (text.R && text.R[0]) {
                  extractedText += decodeURIComponent(text.R[0].T) + ' ';
                }
              });
            }
          });
        }

        if (!extractedText || extractedText.trim().length === 0) {
          console.error('[e] No text content extracted from PDF');
          reject(new Error('No text content found in PDF'));
          return;
        }

        resolve(extractedText.trim());
      });

      pdfParser.on('pdfParser_dataError', (error) => {
        console.error('[e] PDF parsing error:', error);
        reject(error);
      });

      pdfParser.parseBuffer(Buffer.from(pdfData));
    });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF file');
  }
}
