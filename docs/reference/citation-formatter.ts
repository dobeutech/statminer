// src/lib/citation-formatter/index.ts

import { Citation } from '@/types';
import { format } from 'date-fns';

export class MLACitationFormatter {
  /**
   * Formats a citation according to MLA 9th edition guidelines
   * @param citation - The citation object to format
   * @returns Formatted MLA citation string
   */
  public formatCitation(citation: Citation): string {
    switch (citation.type) {
      case 'web':
        return this.formatWebCitation(citation);
      case 'journal':
        return this.formatJournalCitation(citation);
      case 'book':
        return this.formatBookCitation(citation);
      case 'database':
        return this.formatDatabaseCitation(citation);
      case 'api':
        return this.formatAPICitation(citation);
      default:
        return this.formatWebCitation(citation);
    }
  }

  /**
   * Formats a web source citation
   */
  private formatWebCitation(citation: Citation): string {
    const parts: string[] = [];

    // Author(s)
    if (citation.authors && citation.authors.length > 0) {
      parts.push(this.formatAuthors(citation.authors));
    }

    // Title in quotation marks
    if (citation.title) {
      parts.push(`"${citation.title}."`);
    }

    // Website name in italics
    if (citation.source) {
      parts.push(`*${citation.source}*,`);
    }

    // Publication date
    if (citation.year) {
      parts.push(`${citation.year},`);
    }

    // URL
    if (citation.url) {
      parts.push(citation.url.replace(/^https?:\/\//, ''));
    }

    // Access date
    parts.push(`Accessed ${format(citation.accessDate, 'd MMM yyyy')}.`);

    return parts.join(' ');
  }

  /**
   * Formats a journal article citation
   */
  private formatJournalCitation(citation: Citation): string {
    const parts: string[] = [];

    // Author(s)
    if (citation.authors && citation.authors.length > 0) {
      parts.push(this.formatAuthors(citation.authors));
    }

    // Article title in quotation marks
    if (citation.title) {
      parts.push(`"${citation.title}."`);
    }

    // Journal name in italics
    if (citation.source) {
      parts.push(`*${citation.source}*,`);
    }

    // Volume, issue, year
    if (citation.year) {
      parts.push(`${citation.year},`);
    }

    // Page numbers
    if (citation.pageNumbers) {
      parts.push(`pp. ${citation.pageNumbers}.`);
    }

    // DOI or URL
    if (citation.doi) {
      parts.push(`doi:${citation.doi}.`);
    } else if (citation.url) {
      parts.push(citation.url.replace(/^https?:\/\//, ''));
    }

    return parts.join(' ');
  }

  /**
   * Formats a book citation
   */
  private formatBookCitation(citation: Citation): string {
    const parts: string[] = [];

    // Author(s)
    if (citation.authors && citation.authors.length > 0) {
      parts.push(this.formatAuthors(citation.authors));
    }

    // Book title in italics
    if (citation.title) {
      parts.push(`*${citation.title}*.`);
    }

    // Publisher
    if (citation.source) {
      parts.push(`${citation.source},`);
    }

    // Year
    if (citation.year) {
      parts.push(`${citation.year}.`);
    }

    return parts.join(' ');
  }

  /**
   * Formats a database citation
   */
  private formatDatabaseCitation(citation: Citation): string {
    const parts: string[] = [];

    // Database name
    if (citation.source) {
      parts.push(`*${citation.source}*.`);
    }

    // Title of specific dataset
    if (citation.title) {
      parts.push(`"${citation.title}."`);
    }

    // Authors/Organization
    if (citation.authors && citation.authors.length > 0) {
      parts.push(this.formatAuthors(citation.authors));
    }

    // Year
    if (citation.year) {
      parts.push(`${citation.year},`);
    }

    // URL
    if (citation.url) {
      parts.push(citation.url.replace(/^https?:\/\//, ''));
    }

    // Access date
    parts.push(`Accessed ${format(citation.accessDate, 'd MMM yyyy')}.`);

    return parts.join(' ');
  }

  /**
   * Formats an API citation
   */
  private formatAPICitation(citation: Citation): string {
    const parts: string[] = [];

    // API Provider/Organization
    if (citation.authors && citation.authors.length > 0) {
      parts.push(this.formatAuthors(citation.authors));
    } else if (citation.source) {
      parts.push(`${citation.source}.`);
    }

    // API Name/Title
    if (citation.title) {
      parts.push(`"${citation.title}."`);
    }

    // Type identifier
    parts.push('API.');

    // Version/Year
    if (citation.year) {
      parts.push(`Version ${citation.year},`);
    }

    // URL
    if (citation.url) {
      parts.push(citation.url.replace(/^https?:\/\//, ''));
    }

    // Access date
    parts.push(`Accessed ${format(citation.accessDate, 'd MMM yyyy')}.`);

    return parts.join(' ');
  }

  /**
   * Formats author names according to MLA guidelines
   */
  private formatAuthors(authors: string[]): string {
    if (authors.length === 0) return '';

    if (authors.length === 1) {
      return this.formatSingleAuthor(authors[0]) + '.';
    }

    if (authors.length === 2) {
      return `${this.formatSingleAuthor(authors[0])}, and ${authors[1]}.`;
    }

    // Three or more authors: use "et al."
    return `${this.formatSingleAuthor(authors[0])}, et al.`;
  }

  /**
   * Formats a single author name (Last, First Middle)
   */
  private formatSingleAuthor(author: string): string {
    const parts = author.trim().split(' ');
    if (parts.length === 1) return author;

    const lastName = parts[parts.length - 1];
    const firstAndMiddle = parts.slice(0, -1).join(' ');
    return `${lastName}, ${firstAndMiddle}`;
  }

  /**
   * Generates a Works Cited page from an array of citations
   */
  public generateWorksCited(citations: Citation[]): string {
    const header = '## Works Cited\n\n';
    
    // Remove duplicates and sort alphabetically
    const uniqueCitations = this.removeDuplicates(citations);
    const sortedCitations = this.sortCitations(uniqueCitations);
    
    const formattedCitations = sortedCitations.map(citation => 
      this.formatCitation(citation)
    );

    return header + formattedCitations.join('\n\n');
  }

  /**
   * Removes duplicate citations based on URL or DOI
   */
  private removeDuplicates(citations: Citation[]): Citation[] {
    const seen = new Set<string>();
    return citations.filter(citation => {
      const key = citation.doi || citation.url || citation.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Sorts citations alphabetically by author's last name or title
   */
  private sortCitations(citations: Citation[]): Citation[] {
    return citations.sort((a, b) => {
      const aKey = this.getSortKey(a);
      const bKey = this.getSortKey(b);
      return aKey.localeCompare(bKey);
    });
  }

  /**
   * Gets the sort key for a citation (author's last name or title)
   */
  private getSortKey(citation: Citation): string {
    if (citation.authors && citation.authors.length > 0) {
      const firstAuthor = citation.authors[0];
      const parts = firstAuthor.trim().split(' ');
      return parts[parts.length - 1].toLowerCase();
    }
    return (citation.title || citation.source || '').toLowerCase();
  }

  /**
   * Generates an in-text citation
   */
  public generateInTextCitation(citation: Citation, pageNumber?: string): string {
    let inText = '';

    if (citation.authors && citation.authors.length > 0) {
      if (citation.authors.length === 1) {
        const lastName = citation.authors[0].split(' ').pop();
        inText = `(${lastName}`;
      } else if (citation.authors.length === 2) {
        const lastName1 = citation.authors[0].split(' ').pop();
        const lastName2 = citation.authors[1].split(' ').pop();
        inText = `(${lastName1} and ${lastName2}`;
      } else {
        const lastName = citation.authors[0].split(' ').pop();
        inText = `(${lastName} et al.`;
      }
    } else if (citation.source) {
      // Use shortened title if no author
      const shortTitle = citation.title ? 
        citation.title.split(' ').slice(0, 3).join(' ') : 
        citation.source;
      inText = `("${shortTitle}"`;
    }

    if (pageNumber) {
      inText += ` ${pageNumber})`;
    } else {
      inText += ')';
    }

    return inText;
  }
}