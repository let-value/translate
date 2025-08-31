export const withLeadingComment = (pattern: string): string => `(
  ((comment) @comment .)?
  (expression_statement ${pattern})
)`;
