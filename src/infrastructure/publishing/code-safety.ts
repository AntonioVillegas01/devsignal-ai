import ts from 'typescript';
import type { ContentSafetyPort } from '../../application/ports';
import { sanitizeMarkdown } from './markdown';
export class TypeScriptSafety implements ContentSafetyPort {
  sanitize = sanitizeMarkdown;
  async typecheck(code: string): Promise<string[]> {
    if (
      code.length > 10000 ||
      /@ts-(?:ignore|nocheck|expect-error)|<reference\b/.test(code)
    )
      return ['code_suppression_or_size'];
    const file = '/devsignal-example.ts';
    const source = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.ES2022,
      true,
    );
    const forbidden = new Set([
      'require',
      'eval',
      'Function',
      'process',
      'globalThis',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'Deno',
      'Bun',
    ]);
    let unsafe = false;
    function visit(node: ts.Node) {
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportEqualsDeclaration(node) ||
        (ts.isExportDeclaration(node) && node.moduleSpecifier) ||
        node.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node) && forbidden.has(node.text)) ||
        node.kind === ts.SyntaxKind.AnyKeyword ||
        ts.isAsExpression(node) ||
        ts.isTypeAssertionExpression(node) ||
        node.kind === ts.SyntaxKind.DeclareKeyword
      )
        unsafe = true;
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (unsafe) return ['code_unsupported_or_unsafe_construct'];
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      lib: ['lib.es2022.d.ts'],
      types: [],
      skipLibCheck: true,
      noUncheckedIndexedAccess: true,
    };
    const host = ts.createCompilerHost(options);
    const consoleFile = '/devsignal-console.d.ts';
    const consoleSource = ts.createSourceFile(
      consoleFile,
      'declare const console: { log(...data: unknown[]): void; error(...data: unknown[]): void; };',
      ts.ScriptTarget.ES2022,
      true,
    );
    const originalGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (name, version, onError, shouldCreate) =>
      name === file
        ? source
        : name === consoleFile
          ? consoleSource
          : originalGetSourceFile(name, version, onError, shouldCreate);
    host.writeFile = () => {
      throw new Error('Code checking must never emit files');
    };
    const program = ts.createProgram([file, consoleFile], options, host);
    return ts
      .getPreEmitDiagnostics(program)
      .slice(0, 10)
      .map(
        (diagnostic) =>
          `typescript:${diagnostic.code}:${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').slice(0, 160)}`,
      );
  }
}
