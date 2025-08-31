import { GetTextComment } from 'gettext-parser';
import type Parser from 'tree-sitter';

export function cleanComment(node: Parser.SyntaxNode): string {
    const text = node.text;
    if (text.startsWith('/*')) {
        return text
            .slice(2, -2)
            .replace(/^\s*\*?\s*/gm, '')
            .trim();
    }
    return text.replace(/^\/\/\s?/, '').trim();
}

export const withComment = {
    pattern(pattern: string): string {
        return (
            `(
  ((comment) @comment .)?
  (expression_statement ${pattern})
)`
        );
    },
    extract(match: Parser.QueryMatch): GetTextComment | undefined {
        const comment = match.captures.find(c => c.name === 'comment')?.node;
        if (!comment) {
            return undefined;
        }

        return {
            extracted: cleanComment(comment),
        };
    },
};