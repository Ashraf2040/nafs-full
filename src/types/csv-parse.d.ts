declare module 'csv-parse/sync' {
  export function parse(
    input: string | Buffer,
    options?: {
      columns?: boolean | string[] | ((record: string[]) => string[]);
      skip_empty_lines?: boolean;
      trim?: boolean;
      delimiter?: string;
      [key: string]: any;
    }
  ): any[];
}