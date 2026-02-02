import { PageMetadata } from "./types";

export interface MarkdownFileOptions {
  includeFrontmatter?: boolean;
  includeMetadata?: boolean;
  includeSourceUrl?: boolean;
  includeFetchTime?: boolean;
}

export class MarkdownFormatter {
  /**
   * Format markdown content into a well-structured markdown file
   */
  static formatToFile(
    metadata: PageMetadata,
    options: MarkdownFileOptions = {},
  ): string {
    const {
      includeFrontmatter = true,
      includeMetadata = true,
      includeSourceUrl = true,
      includeFetchTime = true,
    } = options;

    const sections: string[] = [];

    if (includeFrontmatter) {
      sections.push(this.generateFrontmatter(metadata));
    }

    if (metadata.title) {
      sections.push(`# ${metadata.title}`);
      sections.push("");
    }

    if (includeMetadata) {
      const metadataSection = this.generateMetadataSection(
        metadata,
        includeSourceUrl,
        includeFetchTime,
      );
      if (metadataSection) {
        sections.push(metadataSection);
      }
    }

    if (metadata.bodyMarkdown) {
      sections.push(metadata.bodyMarkdown);
    }

    return sections.join("\n\n").trim() + "\n";
  }

  /**
   * Generate YAML frontmatter for markdown files
   */
  private static generateFrontmatter(metadata: PageMetadata): string {
    const frontmatter: string[] = ["---"];

    if (metadata.title) {
      frontmatter.push(`title: "${this.escapeYaml(metadata.title)}"`);
    }

    if (metadata.summary) {
      frontmatter.push(`description: "${this.escapeYaml(metadata.summary)}"`);
    }

    if (metadata.url) {
      frontmatter.push(`source: "${metadata.url}"`);
    }

    if (metadata.fullUrl && metadata.fullUrl !== metadata.url) {
      frontmatter.push(`fullUrl: "${metadata.fullUrl}"`);
    }

    if (metadata.image) {
      frontmatter.push(`image: "${metadata.image}"`);
    }

    if (metadata.icon) {
      frontmatter.push(`icon: "${metadata.icon}"`);
    }

    if (metadata.fetchTimeUts) {
      const date = new Date(metadata.fetchTimeUts).toISOString();
      frontmatter.push(`fetchedAt: "${date}"`);
    }

    if (metadata.hash) {
      frontmatter.push(`contentHash: "${metadata.hash}"`);
    }

    frontmatter.push("---");

    return frontmatter.join("\n");
  }


  private static generateMetadataSection(
    metadata: PageMetadata,
    includeSourceUrl: boolean,
    includeFetchTime: boolean,
  ): string {
    const items: string[] = [];

    if (metadata.summary) {
      items.push(`> ${metadata.summary}`);
      items.push("");
    }

    const details: string[] = [];

    if (includeSourceUrl && metadata.url) {
      details.push(`**Source:** [${metadata.url}](${metadata.url})`);
    }

    if (includeFetchTime && metadata.fetchTimeUts) {
      const date = new Date(metadata.fetchTimeUts).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });
      details.push(`**Fetched:** ${date}`);
    }

    if (metadata.hash) {
      details.push(`**Content Hash:** \`${metadata.hash}\``);
    }

    if (details.length > 0) {
      items.push(details.join(" • "));
      items.push("");
      items.push("---");
    }

    return items.join("\n");
  }

  /**
   * Escape special characters for YAML
   */
  private static escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, " ");
  }

  /**
   * Clean and normalize markdown content
   */
  static cleanMarkdown(markdown: string): string {
    markdown = markdown.replace(/^(#{1,6})\s*#+\s*/gm, "$1 ");

    markdown = markdown.replace(/\n{3,}/g, "\n\n");

    markdown = markdown
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");

    markdown = markdown.trim();

    markdown = markdown.replace(/```(\w*)\n/g, "```$1\n");

    const lines = markdown.split("\n");
    let inCodeBlock = false;
    const cleanedLines = lines.map((line) => {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      if (inCodeBlock) {
        return line;
      }
      return line.replace(/ {2,}/g, " ");
    });
    markdown = cleanedLines.join("\n");

    markdown = markdown.replace(/^(#{1,6})\s+/gm, (match, hashes) => {
      return hashes + " ";
    });

    markdown = markdown.replace(
      /^(#{1,6})\s+(.*)$/gm,
      (match, hashes, text) => {
        const cleanText = text.replace(/^#+\s*/, "");
        return hashes + " " + cleanText;
      },
    );

    markdown = markdown.replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2");

    markdown = markdown.replace(/(#{1,6} .+)\n([^\n#])/g, "$1\n\n$2");

    markdown = markdown.replace(/([^\n])\n([-*+] )/g, "$1\n\n$2");

    markdown = markdown.replace(/([-*+] .+)\n([^\n-*+#\n])/g, "$1\n\n$2");

    markdown = markdown.replace(/([^\n])\n(---+)\n([^\n])/g, "$1\n\n$2\n\n$3");

    markdown = markdown.replace(
      /!\[([^\]]*)\]\(([^\)]+)\)\s*\n\s*([^\n]+)\s*\n\s*\]\(([^\)]+)\)/g,
      "[$3]($4)",
    );

    markdown = markdown.replace(/\n{3,}/g, "\n\n");

    return markdown.trim();
  }

  /**
   * Generate a filename from page metadata
   */
  static generateFilename(metadata: PageMetadata): string {
    let filename = metadata.title || "untitled";

    filename = filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);

    const shortHash = metadata.hash.substring(0, 8);

    return `${filename}-${shortHash}.md`;
  }

  /**
   * Convert markdown to plain text (strip markdown syntax)
   */
  static toPlainText(markdown: string): string {
    let text = markdown;

    text = text.replace(/^---\n[\s\S]*?\n---\n/m, "");

    text = text.replace(/```[\s\S]*?```/g, "");

    text = text.replace(/`[^`]+`/g, "");

    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");

    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    text = text.replace(/^#{1,6}\s+/gm, "");

    text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
    text = text.replace(/(\*|_)(.*?)\1/g, "$2");

    text = text.replace(/^---+$/gm, "");

    text = text.replace(/^[\s]*[-*+]\s+/gm, "");
    text = text.replace(/^[\s]*\d+\.\s+/gm, "");

    text = text.replace(/^>\s+/gm, "");

    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    return text;
  }
}
