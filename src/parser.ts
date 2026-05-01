import { SetFile, SetLine } from './types';

export function parseSetFile(filename: string, content: string): SetFile {
  const rawLines = content.split(/\r?\n/);
  const lines: SetLine[] = rawLines.map((raw): SetLine => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return { type: 'blank', raw };
    }
    if (trimmed.startsWith(';')) {
      return { type: 'comment', raw };
    }
    const eqIdx = raw.indexOf('=');
    if (eqIdx !== -1) {
      const key = raw.substring(0, eqIdx).trim();
      const value = raw.substring(eqIdx + 1).trim();
      return { type: 'param', raw, key, value };
    }
    return { type: 'comment', raw };
  });

  return {
    id: crypto.randomUUID(),
    filename,
    lines,
  };
}

export function groupParams(lines: SetLine[]): Record<string, { key: string; value: string }[]> {
  const groups: Record<string, { key: string; value: string }[]> = {};
  let currentSection = 'General';

  for (const line of lines) {
    if (line.type === 'comment') {
      // Try to extract section name from comment like "; -  /   -   /    Trades    \   -   \  -"
      const sectionMatch = line.raw.match(/\/\s+[-\s]*\/\s+(.+?)\s+\\/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
      }
    } else if (line.type === 'param' && line.key && line.value !== undefined) {
      if (!groups[currentSection]) groups[currentSection] = [];
      groups[currentSection].push({ key: line.key, value: line.value });
    }
  }

  return groups;
}
