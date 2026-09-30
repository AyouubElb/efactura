import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import pdfmake from 'pdfmake';
import { layout } from './layout.js';
import type { Printable } from './printable.js';

// Roboto ships with pdfmake and has every French accent
const FONTS = join(
  dirname(createRequire(import.meta.url).resolve('pdfmake/package.json')),
  'fonts',
  'Roboto',
);

@Injectable()
export class PdfService {
  constructor() {
    pdfmake.addFonts({
      Roboto: {
        normal: join(FONTS, 'Roboto-Regular.ttf'),
        bold: join(FONTS, 'Roboto-Medium.ttf'),
        italics: join(FONTS, 'Roboto-Italic.ttf'),
        bolditalics: join(FONTS, 'Roboto-MediumItalic.ttf'),
      },
    });
    // Nothing from the network, and from the disk only the fonts
    pdfmake.setUrlAccessPolicy(() => false);
    pdfmake.setLocalAccessPolicy((path) => path.startsWith(FONTS));
  }

  render(doc: Printable, logo: Buffer | null, logoType?: string): Promise<Buffer> {
    const dataUrl = logo ? toDataUrl(logo, logoType ?? 'image/png') : null;
    return pdfmake.createPdf(layout(doc, dataUrl)).getBuffer();
  }

  // A file can start like a PNG and still be one pdfmake can't draw
  async canDraw(image: Buffer, type: string): Promise<boolean> {
    try {
      await pdfmake
        .createPdf({ content: [{ image: toDataUrl(image, type), width: 50 }] })
        .getBuffer();
      return true;
    } catch {
      return false;
    }
  }
}

function toDataUrl(image: Buffer, type: string): string {
  return `data:${type};base64,${image.toString('base64')}`;
}
