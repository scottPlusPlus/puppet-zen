export type UnixTimestamp = number;
export type MarkdownString = string;

export interface WebContentArgs {
  fullHtml?: boolean;
  bodyMarkdown?: boolean;
}

export interface PageMetadata {
  url: string;
  fullUrl: string;
  hash: string;
  title: string;
  summary: string;
  image: string;
  icon?: string;
  fetchTimeUts: UnixTimestamp;
  fullHtml?: string;
  bodyMarkdown?: MarkdownString;
}
