declare module "pdfkit" {
  import { Readable } from "stream";
  type TextOptions = Record<string, unknown>;
  type PageMargins = {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  type PageInfo = {
    width: number;
    height: number;
    margins: PageMargins;
  };
  class PDFDocument extends Readable {
    constructor(options?: Record<string, unknown>);
    page: PageInfo;
    addPage(options?: Record<string, unknown>): this;
    save(): this;
    restore(): this;
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    lineWidth(width: number): this;
    rect(x: number, y: number, width: number, height: number): this;
    roundedRect(x: number, y: number, width: number, height: number, radius: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    text(text: string, options?: TextOptions): this;
    text(text: string, x: number, y: number, options?: TextOptions): this;
    heightOfString(text: string, options?: TextOptions): number;
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
