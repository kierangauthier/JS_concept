/**
 * ingest-pdf.ts — Script d'ingestion de PDFs dans la base documentaire (RAG)
 *
 * Usage :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/ingest-pdf.ts \
 *     --file "/path/to/Guide_Technique.pdf" \
 *     --company co_tp \
 *     --tags "maintenance,codes_erreur"
 *
 * Requiert : npm install pdf-parse @types/pdf-parse
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── Parsing des arguments CLI ──────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (key: string): string | undefined => {
  const i = args.indexOf(`--${key}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const filePath  = getArg('file');
const companyId = getArg('company') ?? 'co_tp';
const tagsRaw   = getArg('tags') ?? '';
const chunkSize = parseInt(getArg('chunk-size') ?? '600', 10); // mots par chunk

if (!filePath) {
  console.error('Usage: ingest-pdf.ts --file <path> [--company co_tp] [--tags "tag1,tag2"] [--chunk-size 600]');
  process.exit(1);
}

// ─── Découpage en chunks ─────────────────────────────────────────────────────
function splitIntoChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    current.push(word);
    if (current.length >= wordsPerChunk) {
      // Tente de terminer sur une phrase
      if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?') || current.length >= wordsPerChunk + 50) {
        chunks.push(current.join(' '));
        current = [];
      }
    }
  }

  if (current.length > 20) chunks.push(current.join(' '));
  return chunks;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📄 Ingestion : ${path.basename(filePath!)}`);

  let pdfParse: any;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    console.error('❌ pdf-parse non installé. Exécute : npm install pdf-parse --legacy-peer-deps');
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath!);
  const data = await pdfParse(buffer);

  console.log(`   Pages : ${data.numpages} · Texte extrait : ${data.text.length} caractères`);

  // Nettoyage basique du texte
  const cleanText = data.text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const chunks = splitIntoChunks(cleanText, chunkSize);
  const sourceName = path.basename(filePath!);
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : ['pdf'];

  // Supprime les anciens chunks de ce fichier pour cette entreprise
  const deleted = await prisma.knowledgeChunk.deleteMany({
    where: { source: sourceName, companyId },
  });
  if (deleted.count > 0) console.log(`   🗑️  ${deleted.count} anciens chunks supprimés`);

  // Insère les nouveaux chunks
  const created = await prisma.knowledgeChunk.createMany({
    data: chunks.map((content, i) => ({
      content,
      source: sourceName,
      sourceType: 'pdf',
      chunkIndex: i,
      tags,
      companyId,
    })),
  });

  console.log(`   ✅ ${created.count} chunks indexés depuis ${sourceName}`);
  console.log(`   🏷️  Tags : ${tags.join(', ')}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
