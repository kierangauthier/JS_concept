import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FacturXProfile } from './facturx.generator';

/**
 * V6.3 — Factur-X hybrid PDF/A-3 pipeline.
 *
 * Three stages:
 *   1. The caller gives us a regular PDF (produced by pdfmake) and the CII XML.
 *   2. We convert the PDF to PDF/A-3 using Ghostscript (`gs -dPDFA=3`).
 *   3. We attach the XML as an embedded file with the right `/AFRelationship`
 *      and write the Factur-X XMP metadata using pdf-lib.
 *
 * Ghostscript is called as an external binary. It must be installed in the
 * runtime image (see api/Dockerfile). If it is absent, the service raises a
 * clear InternalServerError — callers can then offer the raw PDF + XML
 * fallback if they want.
 *
 * pdf-lib is a runtime dependency (added to package.json). It is loaded
 * dynamically so a fresh clone that hasn't run `npm install` still compiles.
 */

const GS_BINARY = process.env.GHOSTSCRIPT_BIN ?? 'gs';
const XMP_FILENAME = 'factur-x.xml';

/** Human-readable mapping for the XMP metadata block. */
const PROFILE_XMP_CONFORMANCE: Record<FacturXProfile, string> = {
  MINIMUM: 'MINIMUM',
  BASIC: 'BASIC',
  EN16931: 'EN 16931',
};

export interface BuildFacturXInput {
  /** Raw PDF bytes (from pdfmake). */
  pdf: Buffer;
  /** CII XML string. */
  xml: string;
  /** Target profile — must match the one declared in the XML. */
  profile: FacturXProfile;
  /** Invoice reference — used to label the attachment description. */
  invoiceReference: string;
}

@Injectable()
export class FacturXPdfService {
  private readonly logger = new Logger(FacturXPdfService.name);

  async build(input: BuildFacturXInput): Promise<Buffer> {
    // 1) Convert the incoming PDF to PDF/A-3 via Ghostscript.
    const pdfA3 = await this.convertToPdfA3(input.pdf);

    // 2) Attach the XML and write Factur-X XMP metadata.
    return this.attachXmlAndMetadata(pdfA3, input);
  }

  // ─── Ghostscript stage ──────────────────────────────────────────────────

  private async convertToPdfA3(pdf: Buffer): Promise<Buffer> {
    const workdir = await mkdtemp(join(tmpdir(), 'facturx-'));
    const inputPath = join(workdir, 'in.pdf');
    const outputPath = join(workdir, 'out.pdf');
    const defPath = join(workdir, 'pdfa.ps');

    try {
      await writeFile(inputPath, pdf);
      await writeFile(defPath, buildPdfaDefFile());

      await this.runGhostscript([
        '-dPDFA=3',
        '-dBATCH',
        '-dNOPAUSE',
        '-dNOOUTERSAVE',
        '-dPDFACompatibilityPolicy=1',
        // sRGB conversion strategy — validated against Ghostscript 10.07.
        // `UseDeviceIndependentColor` triggers an ioerror on recent builds,
        // sRGB is the FNFE-MPE reference and passes mustangproject.
        '-sColorConversionStrategy=sRGB',
        '-sDEVICE=pdfwrite',
        `-sOutputFile=${outputPath}`,
        defPath,
        inputPath,
      ]);

      return await readFile(outputPath);
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {
        // best-effort cleanup
      });
    }
  }

  private runGhostscript(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(GS_BINARY, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(
            new InternalServerErrorException(
              `Ghostscript binary "${GS_BINARY}" introuvable — l'installer dans l'image Docker pour produire du Factur-X (voir api/Dockerfile).`,
            ),
          );
          return;
        }
        reject(err);
      });
      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        this.logger.error(`Ghostscript exit=${code}\n${stderr}`);
        reject(
          new InternalServerErrorException(
            `Échec de conversion PDF/A-3 (Ghostscript code ${code}).`,
          ),
        );
      });
    });
  }

  // ─── pdf-lib stage — attach XML + Factur-X XMP ──────────────────────────

  private async attachXmlAndMetadata(
    pdfA3: Buffer,
    input: BuildFacturXInput,
  ): Promise<Buffer> {
    const pdfLib = await loadPdfLib();
    if (!pdfLib) {
      throw new InternalServerErrorException(
        'pdf-lib manquant — exécuter `npm install` dans api/ pour activer l\'attachement Factur-X.',
      );
    }
    const { PDFDocument, PDFName, AFRelationship } = pdfLib;

    const doc = await PDFDocument.load(pdfA3, { updateMetadata: false });

    // 1) Attach the XML as an embedded file, marked as ALTERNATIVE per
    //    Factur-X spec. pdf-lib's `afRelationship` option writes the correct
    //    /AFRelationship entry natively — no manual catalog patching required.
    await doc.attach(new TextEncoder().encode(input.xml), XMP_FILENAME, {
      mimeType: 'application/xml',
      description: `Factur-X invoice ${input.invoiceReference}`,
      creationDate: new Date(),
      modificationDate: new Date(),
      afRelationship: AFRelationship.Alternative,
    });

    // 2) Write the Factur-X XMP metadata block into the document catalog.
    const xmpBytes = new TextEncoder().encode(
      buildFacturXXmp(input.invoiceReference, input.profile),
    );
    const metadataStream = doc.context.stream(xmpBytes, {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
    });
    const metadataRef = doc.context.register(metadataStream);
    doc.catalog.set(PDFName.of('Metadata'), metadataRef);

    // 3) Basic document info (recommended, not strictly required).
    doc.setTitle(`Facture ${input.invoiceReference}`);
    doc.setSubject(`Factur-X ${PROFILE_XMP_CONFORMANCE[input.profile]}`);
    doc.setProducer('ConceptManager');

    const bytes = await doc.save({ useObjectStreams: false });
    return Buffer.from(bytes);
  }
}

// ─── Dynamic loader for pdf-lib ─────────────────────────────────────────

async function loadPdfLib(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('pdf-lib');
  } catch {
    return null;
  }
}

// ─── Ghostscript def file (ICC profile declaration) ─────────────────────

function buildPdfaDefFile(): string {
  // Minimal PDF/A-3 definition. We declare the OutputIntent with sRGB as
  // conformance identifier and let Ghostscript resolve the actual ICC profile
  // itself (it ships one internally). The previous approach that tried to
  // stream an ASCII85-encoded profile via `currentfile` was a template
  // placeholder — it crashed Ghostscript 10.07 with an ioerror.
  return `
%!
% PDF/A-3 definition file for Factur-X
[ /Title (Factur-X)
  /Author (ConceptManager)
  /Creator (ConceptManager)
  /DOCINFO pdfmark

[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /OutputConditionIdentifier (sRGB)
  /Info (sRGB IEC61966-2.1)
>> /PUT pdfmark
[{Catalog} <</OutputIntents [{OutputIntent_PDFA}]>> /PUT pdfmark
`;
}

// ─── Factur-X XMP metadata ──────────────────────────────────────────────

function buildFacturXXmp(invoiceRef: string, profile: FacturXProfile): string {
  // The `fx:ConformanceLevel` values are fixed by the FNFE-MPE spec.
  const conformance = profile === 'EN16931' ? 'EN 16931' : profile;
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
        xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Facture ${escapeXml(invoiceRef)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>ConceptManager</rdf:li></rdf:Seq></dc:creator>
      <pdf:Producer>ConceptManager</pdf:Producer>
      <xmp:CreatorTool>ConceptManager</xmp:CreatorTool>
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${XMP_FILENAME}</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>${conformance}</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
