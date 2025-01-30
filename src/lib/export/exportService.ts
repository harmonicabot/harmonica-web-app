import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';

export const exportService = {
  async toMarkdown(content: string): Promise<void> {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async toHtml(content: string): Promise<void> {
    const html = await marked.parse(content);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async toPDF(content: string): Promise<void> {
    // Convert markdown to HTML
    const html = await marked.parse(content);
    console.log(html)
    // Sanitize HTML for security
    const cleanHtml = DOMPurify.sanitize(html);
    console.log(cleanHtml)
    
    // Create PDF with HTML renderer
    const doc = new jsPDF();
    
    // Configure PDF styling
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Add HTML with styling
    doc.html(cleanHtml, {
      callback: function(doc) {
        doc.save(`export-${Date.now()}.pdf`);
      },
      margin: [10, 10, 10, 10],
      autoPaging: true,
      width: 190, // A4 width minus margins
      windowWidth: 794 // A4 width in pixels
    });
  },

  async export(contentToExport: string, format: 'md' | 'pdf' | 'html'): Promise<void> {
    if (format === 'md') {
      await this.toMarkdown(contentToExport);
    } else if (format === 'pdf') {
      await this.toPDF(contentToExport);
    } else {
      await this.toHtml(contentToExport);
    }
  },
};
