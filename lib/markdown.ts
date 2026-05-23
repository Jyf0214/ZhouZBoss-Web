import matter from 'gray-matter';

/**
 * Markdown + Front Matter Parser for Originium Kernel
 */

export interface FrontMatter {
  title: string;
  author?: string;
  tags?: string[];
  cover?: string;
  date?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface ParsedMarkdown {
  content: string;
  frontMatter: FrontMatter;
}

/**
 * Parse Markdown with Front Matter
 */
export function parseMarkdown(markdown: string): ParsedMarkdown {
  try {
    const { data, content } = matter(markdown);
    return {
      content,
      frontMatter: data as FrontMatter,
    };
  } catch {
    // If parsing fails, return full content without front matter
    return {
      content: markdown,
      frontMatter: { title: 'Untitled' },
    };
  }
}

/**
 * Extract front matter only (for indexing)
 */
export function extractFrontMatter(markdown: string): FrontMatter {
  const { frontMatter } = parseMarkdown(markdown);
  return frontMatter;
}

/**
 * Generate Markdown with Front Matter
 */
export function generateMarkdown(frontMatter: FrontMatter, content: string): string {
  return matter.stringify(content, frontMatter);
}

/**
 * Format date for display
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Extract tags from front matter
 */
export function extractTags(markdown: string): string[] {
  const { frontMatter } = parseMarkdown(markdown);
  if (!frontMatter.tags) return [];
  return Array.isArray(frontMatter.tags) ? frontMatter.tags : [frontMatter.tags];
}
