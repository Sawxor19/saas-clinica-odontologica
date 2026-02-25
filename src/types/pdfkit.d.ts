declare module "pdfkit" {
  import { Readable } from "stream";
  class PDFDocument extends Readable {
    constructor(options?: Record<string, unknown>);
    fontSize(size: number): this;
    text(text: string, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    end(): void;
  }
  export default PDFDocument;
}

declare module "pdfkit/js/pdfkit.standalone.js" {
  export { default } from "pdfkit";
}
