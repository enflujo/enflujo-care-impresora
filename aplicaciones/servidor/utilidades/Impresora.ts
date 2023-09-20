import bufferMutable from 'mutable-buffer';
const { MutableBuffer } = bufferMutable;
// import getPixels from 'get-pixels';
import iconv from 'iconv-lite';
import qr from 'qr-image';
import { codeLength, getParityBit, isKey, textLength, textSubstring } from './ayudas';
import {
  BARCODE_FORMAT,
  CASH_DRAWER,
  CHARACTER_SPACING,
  CODE2D_FORMAT,
  COLOR,
  ESC,
  FEED_CONTROL_SEQUENCES,
  HARDWARE,
  LINE_SPACING,
  MARGINS,
  MODEL,
  PAPER,
  TAB,
  TEXT_FORMAT,
  EOL,
  BITMAP_FORMAT,
} from './constantes';

import type { Device, OutEndpoint } from 'usb';
import Image from './Image';

export interface PrinterOptions {
  encoding?: TiposCaracteres | undefined;
  width?: number | undefined;
}
export type TiposCaracteres = 'GB18030' | 'Cp858';
export type PrinterModel = null | 'qsprinter';
export type RasterMode = 'normal' | 'dw' | 'dh' | 'dwdh' | 'dhdw' | 'dwh' | 'dhw';
export interface QrImageOptions extends qr.Options {
  mode: RasterMode;
}
export type BitmapDensity = 's8' | 'd8' | 's24' | 'd24';
export type StyleString = 'normal' | `${'b' | ''}${'i' | ''}${'u' | 'u2' | ''}`;
export type FeedControlSequence = 'lf' | 'glf' | 'ff' | 'cr' | 'ht' | 'vt';
export type Alignment = 'lt' | 'ct' | 'rt';
export type FontFamily = 'a' | 'b' | 'c';
export type HardwareCommand = 'init' | 'select' | 'reset';
export type BarcodeType =
  | 'UPC_A'
  | 'UPC-A'
  | 'UPC-E'
  | 'UPC_E'
  | 'EAN13'
  | 'EAN8'
  | 'CODE39'
  | 'ITF'
  | 'NW7'
  | 'CODE93'
  | 'CODE128';
export type BarcodePosition = 'off' | 'abv' | 'blw' | 'bth';
export type BarcodeFont = 'a' | 'b';
export interface BarcodeOptions {
  width: number;
  height: number;
  position?: BarcodePosition | undefined;
  font?: BarcodeFont | undefined;
  includeParity?: boolean | undefined;
}
export type LegacyBarcodeArguments = [
  width: number,
  height: number,
  position?: BarcodePosition | undefined,
  font?: BarcodeFont | undefined,
];

export type QRLevel = 'l' | 'm' | 'q' | 'h';

export type TableAlignment = 'left' | 'center' | 'right';
export type CustomTableItem = {
  text: string;
  align?: TableAlignment;
  style?: StyleString | undefined;
} & ({ width: number } | { cols: number });

export interface CustomTableOptions {
  size: [number, number];
  encoding: string;
}

export class Impresora {
  public dispositivo: Device;
  public conexion: OutEndpoint;
  public buffer = new MutableBuffer();
  protected options: PrinterOptions;
  protected encoding: TiposCaracteres;
  protected width: number;
  protected _model: PrinterModel = null;

  constructor(dispositivo: Device, conexion: OutEndpoint, options: PrinterOptions) {
    this.dispositivo = dispositivo;
    this.conexion = conexion;
    this.options = options;
    this.encoding = options.encoding ?? 'Cp858';
    this.width = options.width ?? 48;
  }

  fuente(tipo: FontFamily) {
    this.buffer.write(TEXT_FORMAT[`TXT_FONT_${tipo.toUpperCase()}`]);
    if (tipo.toUpperCase() === 'A') this.width = (this.options && this.options.width) || 48;
    else this.width = (this.options && this.options.width) || 56;
    return this;
  }

  escala(ancho: number, alto: number) {
    this.buffer.write(TEXT_FORMAT.TXT_CUSTOM_SIZE(ancho, alto));
    return this;
  }

  espacioEntreLinea(n?: number) {
    if (!n) {
      this.buffer.write(LINE_SPACING.LS_DEFAULT);
    } else {
      this.buffer.write(LINE_SPACING.LS_SET);
      this.buffer.writeUInt8(n);
    }
    return this;
  }

  model(model: PrinterModel) {
    this._model = model;
    return this;
  }

  setCharacterCodeTable(codeTable: number) {
    this.buffer.write(ESC);
    this.buffer.write(TAB);
    this.buffer.writeUInt8(codeTable);
    return this;
  }

  /**
   * Fix bottom margin
   * @param  {[String]} size
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  marginBottom(size: number) {
    this.buffer.write(MARGINS.BOTTOM);
    this.buffer.writeUInt8(size);
    return this;
  }

  /**
   * Fix left margin
   * @param  {[String]} size
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  marginLeft(size: number) {
    this.buffer.write(MARGINS.LEFT);
    this.buffer.writeUInt8(size);
    return this;
  }

  /**
   * Fix right margin
   * @param  {[String]} size
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  marginRight(size: number) {
    this.buffer.write(MARGINS.RIGHT);
    this.buffer.writeUInt8(size);
    return this;
  }

  print(content: string | Buffer) {
    this.buffer.write(content);
    return this;
  }
  /**
   * [function print pure content with End Of Line]
   * @param  {[String]}  content  [mandatory]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  println(content: string) {
    return this.print(content + EOL);
  }

  /**
   * [function print End Of Line]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  newLine() {
    return this.print(EOL);
  }

  /**
   * [function Print encoded alpha-numeric text with End Of Line]
   * @param  {[String]}  content  [mandatory]
   * @param  {[String]}  encoding [optional]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  text(content: string, encoding = this.encoding) {
    return this.print(iconv.encode(`${content}${EOL}`, encoding));
  }

  /**
   * [function Print draw line End Of Line]
   * @param  {[String]}  character [optional]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  drawLine(character = '-') {
    for (let i = 0; i < this.width; i++) {
      this.buffer.write(Buffer.from(character));
    }
    this.newLine();

    return this;
  }

  /**
   * [function Print  table   with End Of Line]
   * @param  {[data]}  data  [mandatory]
   * @param  {[String]}  encoding [optional]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  table(data: (string | number)[], encoding = this.encoding) {
    const cellWidth = this.width / data.length;
    let lineTxt = '';

    for (let i = 0; i < data.length; i++) {
      lineTxt += data[i].toString();

      const spaces = cellWidth - data[i].toString().length;
      for (let j = 0; j < spaces; j++) lineTxt += ' ';
    }
    this.buffer.write(iconv.encode(lineTxt + EOL, encoding));
    return this;
  }

  /**
   * [function Print  custom table  with End Of Line]
   * @param  {[data]}  data  [mandatory]
   * @param  {[String]}  options [optional]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  tableCustom(data: CustomTableItem[], options: CustomTableOptions = { size: [1, 1], encoding: this.encoding }): this {
    let [width, height] = options.size;
    let baseWidth = Math.floor(this.width / width);
    let cellWidth = Math.floor(baseWidth / data.length);
    let leftoverSpace = baseWidth - cellWidth * data.length; // by only data[].width
    let lineStr = '';
    let secondLineEnabled = false;
    let secondLine = [];

    for (let i = 0; i < data.length; i++) {
      const obj = data[i];
      const align = (obj.align || 'left').toUpperCase();

      const ancho = textLength(obj.text);

      if ('width' in obj) {
        cellWidth = baseWidth * obj.width;
      } else if (obj.cols) {
        cellWidth = obj.cols / width;
        leftoverSpace = 0;
      }

      let originalText: string | null = null;
      if (cellWidth < ancho) {
        originalText = obj.text;
        obj.text = textSubstring(obj.text, 0, cellWidth);
      }

      if (align === 'CENTER') {
        let spaces = (cellWidth - ancho) / 2;
        for (let s = 0; s < spaces; s++) lineStr += ' ';

        if (obj.text !== '') {
          if (obj.style) lineStr += `${this._getStyle(obj.style)}${obj.text}${this._getStyle('normal')}`;
          else lineStr += obj.text;
        }

        for (let s = 0; s < spaces - 1; s++) lineStr += ' ';
      } else if (align === 'RIGHT') {
        let spaces = cellWidth - ancho;
        if (leftoverSpace > 0) {
          spaces += leftoverSpace;
          leftoverSpace = 0;
        }

        for (let s = 0; s < spaces; s++) lineStr += ' ';

        if (obj.text !== '') {
          if (obj.style) lineStr += `${this._getStyle(obj.style)}${obj.text}${this._getStyle('normal')}`;
          else lineStr += obj.text;
        }
      } else {
        if (obj.text !== '') {
          if (obj.style) lineStr += `${this._getStyle(obj.style)}${obj.text}${this._getStyle('normal')}`;
          else lineStr += obj.text;
        }

        let spaces = Math.floor(cellWidth - ancho);
        if (leftoverSpace > 0) {
          spaces += leftoverSpace;
          leftoverSpace = 0;
        }

        for (let s = 0; s < spaces; s++) lineStr += ' ';
      }

      if (originalText !== null) {
        secondLineEnabled = true;
        obj.text = textSubstring(originalText, cellWidth);
        secondLine.push(obj);
      } else {
        obj.text = '';
        secondLine.push(obj);
      }
    }

    // Set size to line
    if (width > 1 || height > 1) {
      lineStr = TEXT_FORMAT.TXT_CUSTOM_SIZE(width, height) + lineStr + TEXT_FORMAT.TXT_NORMAL;
    }

    // Write the line
    this.buffer.write(iconv.encode(lineStr + EOL, options.encoding || this.encoding));

    if (secondLineEnabled) {
      // Writes second line if has
      return this.tableCustom(secondLine, options);
    } else {
      return this;
    }
  }

  /**
   * [function Print encoded alpha-numeric text without End Of Line]
   * @param  {[String]}  content  [mandatory]
   * @param  {[String]}  encoding [optional]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  pureText(content: string, encoding = this.encoding) {
    return this.print(iconv.encode(content, encoding));
  }

  /**
   * [function encode text]
   * @param  {[String]}  encoding [mandatory]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  encode(encoding: TiposCaracteres) {
    this.encoding = encoding;
    return this;
  }

  /**
   *
   * @param lineas Número de lineas.
   * @returns this
   */
  lineaVacia(lineas = 1) {
    this.buffer.write(new Array(lineas).fill(EOL).join(''));
    return this;
  }

  /**
   * [feed control sequences]
   * @param  {[type]}    ctrl     [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  control(ctrl: FeedControlSequence) {
    this.buffer.write(FEED_CONTROL_SEQUENCES[`CTL_${ctrl.toUpperCase()}` as const]);
    return this;
  }
  /**
   * [text align]
   * @param  {[type]}    align    [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  align(align: Alignment) {
    this.buffer.write(TEXT_FORMAT[`TXT_ALIGN_${align.toUpperCase()}`]);
    return this;
  }

  /**
   * [font style]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  _getStyle(string: StyleString): string;

  _getStyle(bold: boolean, italic: boolean, underline: boolean | 0 | 1 | 2): string;

  _getStyle(boldOrString: boolean | StyleString, italic?: boolean, underline?: boolean | 0 | 1 | 2) {
    if (typeof boldOrString === 'string') {
      switch (boldOrString.toUpperCase()) {
        case 'B':
          return this._getStyle(true, false, 0);
        case 'I':
          return this._getStyle(false, true, 0);
        case 'U':
          return this._getStyle(false, false, 1);
        case 'U2':
          return this._getStyle(false, false, 2);
        case 'BI':
          return this._getStyle(true, true, 0);
        case 'BIU':
          return this._getStyle(true, true, 1);
        case 'BIU2':
          return this._getStyle(true, true, 2);
        case 'BU':
          return this._getStyle(true, false, 1);
        case 'BU2':
          return this._getStyle(true, false, 2);
        case 'IU':
          return this._getStyle(false, true, 1);
        case 'IU2':
          return this._getStyle(false, true, 2);
        case 'NORMAL':
        default:
          return this._getStyle(false, false, 0);
      }
    } else {
      let styled = `${boldOrString ? TEXT_FORMAT.TXT_BOLD_ON : TEXT_FORMAT.TXT_BOLD_OFF}${
        italic ? TEXT_FORMAT.TXT_ITALIC_ON : TEXT_FORMAT.TXT_ITALIC_OFF
      }`;
      if (underline === 0 || underline === false) styled += TEXT_FORMAT.TXT_UNDERL_OFF;
      else if (underline === 1 || underline === true) styled += TEXT_FORMAT.TXT_UNDERL_ON;
      else if (underline === 2) styled += TEXT_FORMAT.TXT_UNDERL2_ON;
      return styled;
    }
  }

  /**
   * [font style]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  style(string: StyleString): this;
  style(bold: boolean, italic: boolean, underline: boolean | 0 | 1 | 2): this;
  style(boldOrString: boolean | StyleString, italic?: boolean, underline?: boolean | 0 | 1 | 2) {
    const style =
      typeof boldOrString === 'string'
        ? this._getStyle(boldOrString)
        : this._getStyle(boldOrString, italic as boolean, underline as boolean);
    this.buffer.write(style);
    return this;
  }

  /**
   * [set character spacing]
   * @param  {[type]}    n     [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  spacing(n?: number | null) {
    if (n === undefined || n === null) {
      this.buffer.write(CHARACTER_SPACING.CS_DEFAULT);
    } else {
      this.buffer.write(CHARACTER_SPACING.CS_SET);
      this.buffer.writeUInt8(n);
    }
    return this;
  }

  /**
   * [hardware]
   * @param  {[type]}    hw       [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  hardware(hw: HardwareCommand) {
    this.buffer.write(HARDWARE[`HW_${hw.toUpperCase()}` as const]);
    return this;
  }

  private static isLegacyBarcodeOptions(
    optionsOrLegacy: [BarcodeOptions] | LegacyBarcodeArguments
  ): optionsOrLegacy is LegacyBarcodeArguments {
    return typeof optionsOrLegacy[0] === 'object';
  }

  /**
   * [barcode]
   * @param  {[type]}    code     [description]
   * @param  {[type]}    type     [description]
   * @param  {[type]}    options  [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  barcode(code: number, type: BarcodeType, options: BarcodeOptions): this;
  barcode(code: number, type: BarcodeType, ...optionsOrLegacy: [BarcodeOptions] | LegacyBarcodeArguments) {
    let options: BarcodeOptions;
    if (Impresora.isLegacyBarcodeOptions(optionsOrLegacy)) {
      options = {
        width: optionsOrLegacy[0],
        height: optionsOrLegacy[1],
        position: optionsOrLegacy[2],
        font: optionsOrLegacy[3],
        includeParity: true,
      };
    } else [options] = optionsOrLegacy;
    options.font = options.font ?? 'a';
    options.position = options.position ?? 'blw';
    options.includeParity = options.includeParity ?? true;

    const convertCode = code.toString(10);
    let parityBit = '';
    let conteo = '';
    if (typeof type === 'undefined' || type === null) {
      throw new TypeError('barcode type is required');
    }
    if (type === 'EAN13' && convertCode.length !== 12) {
      throw new Error('EAN13 Barcode type requires code length 12');
    }
    if (type === 'EAN8' && convertCode.length !== 7) {
      throw new Error('EAN8 Barcode type requires code length 7');
    }
    if (this._model === 'qsprinter') {
      this.buffer.write(MODEL.QSPRINTER.BARCODE_MODE.ON);
    }
    if (this._model === 'qsprinter') {
      // qsprinter has no BARCODE_WIDTH command (as of v7.5)
    } else if (isKey(options.width, BARCODE_FORMAT.BARCODE_WIDTH)) {
      this.buffer.write(BARCODE_FORMAT.BARCODE_WIDTH[options.width]);
    } else {
      this.buffer.write(BARCODE_FORMAT.BARCODE_WIDTH_DEFAULT);
    }
    if (options.height >= 1 && options.height <= 255) {
      this.buffer.write(BARCODE_FORMAT.BARCODE_HEIGHT(options.height));
    } else {
      if (this._model === 'qsprinter') {
        this.buffer.write(MODEL.QSPRINTER.BARCODE_HEIGHT_DEFAULT);
      } else {
        this.buffer.write(BARCODE_FORMAT.BARCODE_HEIGHT_DEFAULT);
      }
    }
    if (this._model === 'qsprinter') {
      // Qsprinter has no barcode font
    } else {
      this.buffer.write(BARCODE_FORMAT[`BARCODE_FONT_${options.font.toUpperCase()}` as const]);
    }
    this.buffer.write(BARCODE_FORMAT[`BARCODE_TXT_${options.position.toUpperCase()}` as const]);

    let normalizedType = type.toUpperCase();
    if (normalizedType === 'UPC-A') normalizedType = 'UPC_A';
    else if (normalizedType === 'UPC-E') normalizedType = 'UPC_E';

    this.buffer.write(BARCODE_FORMAT[`BARCODE_${normalizedType}` as const]);
    if (options.includeParity) {
      if (type === 'EAN13' || type === 'EAN8') {
        parityBit = getParityBit(convertCode);
      }
    }
    if (type == 'CODE128' || type == 'CODE93') {
      conteo = codeLength(convertCode);
    }
    this.buffer.write(conteo + convertCode + (options.includeParity ? parityBit : '') + '\x00'); // Allow to skip the parity byte
    if (this._model === 'qsprinter') {
      this.buffer.write(MODEL.QSPRINTER.BARCODE_MODE.OFF);
    }
    return this;
  }

  /**
   * [print qrcode]
   * @param  {[type]} content    [description]
   * @param  {[type]} version [description]
   * @param  {[type]} level   [description]
   * @param  {[type]} size    [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  qrcode(content: string, version?: number | undefined, level?: QRLevel | undefined, size?: number | undefined) {
    if (this._model !== 'qsprinter') {
      this.buffer.write(CODE2D_FORMAT.TYPE_QR);
      this.buffer.write(CODE2D_FORMAT.CODE2D);
      this.buffer.writeUInt8(version ?? 3);
      this.buffer.write(CODE2D_FORMAT[`QR_LEVEL_${(level ?? 'L').toUpperCase()}` as const]);
      this.buffer.writeUInt8(size ?? 6);
      this.buffer.writeUInt16LE(content.length);
      this.buffer.write(content);
    } else {
      const dataRaw = iconv.encode(content, 'utf8');
      if (dataRaw.length < 1 && dataRaw.length > 2710) {
        throw new Error('Invalid code length in byte. Must be between 1 and 2710');
      }

      // Set pixel size
      if (!size || (size && typeof size !== 'number')) size = MODEL.QSPRINTER.CODE2D_FORMAT.PIXEL_SIZE.DEFAULT;
      else if (size && size < MODEL.QSPRINTER.CODE2D_FORMAT.PIXEL_SIZE.MIN)
        size = MODEL.QSPRINTER.CODE2D_FORMAT.PIXEL_SIZE.MIN;
      else if (size && size > MODEL.QSPRINTER.CODE2D_FORMAT.PIXEL_SIZE.MAX)
        size = MODEL.QSPRINTER.CODE2D_FORMAT.PIXEL_SIZE.MAX;
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.PIXEL_SIZE.CMD);
      this.buffer.writeUInt8(size);

      // Set version
      if (!version || (version && typeof version !== 'number')) version = MODEL.QSPRINTER.CODE2D_FORMAT.VERSION.DEFAULT;
      else if (version && version < MODEL.QSPRINTER.CODE2D_FORMAT.VERSION.MIN)
        version = MODEL.QSPRINTER.CODE2D_FORMAT.VERSION.MIN;
      else if (version && version > MODEL.QSPRINTER.CODE2D_FORMAT.VERSION.MAX)
        version = MODEL.QSPRINTER.CODE2D_FORMAT.VERSION.MAX;
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.VERSION.CMD);
      this.buffer.writeUInt8(version);

      // Set level
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.LEVEL.CMD);
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.LEVEL.OPTIONS[(level ?? 'L').toUpperCase()]);

      // Transfer data(code) to buffer
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.SAVEBUF.CMD_P1);
      this.buffer.writeUInt16LE(dataRaw.length + MODEL.QSPRINTER.CODE2D_FORMAT.LEN_OFFSET);
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.SAVEBUF.CMD_P2);
      this.buffer.write(dataRaw);

      // Print from buffer
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.PRINTBUF.CMD_P1);
      this.buffer.writeUInt16LE(dataRaw.length + MODEL.QSPRINTER.CODE2D_FORMAT.LEN_OFFSET);
      this.buffer.write(MODEL.QSPRINTER.CODE2D_FORMAT.PRINTBUF.CMD_P2);
    }
    return this;
  }

  // /**
  //  * [print qrcode image]
  //  * @param  {[type]}   text  [description]
  //  * @param  {[type]}   options  [description]
  //  * @return {[Promise]}
  //  */
  // qrimage(text: string, options: QrImageOptions = { type: 'png', mode: 'dhdw' }): Promise<this> {
  //   return new Promise((resolve, reject) => {
  //     const buffer = qr.imageSync(text, options);
  //     const type = ['image', options.type].join('/');
  //     getPixels(buffer, type, (err, pixels) => {
  //       if (err) reject(err);
  //       this.raster(new Image(pixels), options.mode);
  //       resolve(this);
  //     });
  //   });
  // }

  async image(image: Image, density: BitmapDensity = 'd24') {
    if (!(image instanceof Image)) throw new TypeError('Only escpos.Image supported');
    const n = !!~['D8', 'S8'].indexOf(density.toUpperCase()) ? 1 : 3;
    const header = BITMAP_FORMAT[`BITMAP_${density.toUpperCase()}`];
    const bitmap = image.toBitmap(n * 8);

    this.espacioEntreLinea(0); // set line spacing to 0
    bitmap.data.forEach((line) => {
      this.buffer.write(header);
      this.buffer.writeUInt16LE(line.length / n);
      this.buffer.write(line);
      this.buffer.write(EOL);
    });
    // added a delay so the printer can process the graphical data
    // when connected via slower connection ( e.g.: Serial)
    await new Promise<void>((resolve) => {
      // setTimeout(() => {
      resolve();
      // }, 200);
    });

    return this.espacioEntreLinea();
  }

  // /**
  //  * [raster description]
  //  * @param  {[type]} image [description]
  //  * @param  {[type]} mode  Raster mode (
  //  * @return {[Printer]} printer  [the escpos printer instance]
  //  */
  // raster(image: Image, mode: RasterMode = 'normal') {
  //   if (!(image instanceof Image)) throw new TypeError('Only escpos.Image supported');
  //   let modo = mode.toUpperCase();

  //   if (modo === 'DHDW' || modo === 'DWH' || modo === 'DHW') modo = 'DWDH';
  //   const raster = image.toRaster();
  //   const header = GSV0_FORMAT[`GSV0_${mode}` as const];
  //   this.buffer.write(header);
  //   this.buffer.writeUInt16LE(raster.width);
  //   this.buffer.writeUInt16LE(raster.height);
  //   this.buffer.write(raster.data);
  //   return this;
  // }

  /**
   * [function Send pulse to kick the cash drawer]
   * @param  {[type]} pin [description]
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  cashdraw(pin: 2 | 5 = 2) {
    this.buffer.write(CASH_DRAWER[pin === 5 ? 'CD_KICK_5' : 'CD_KICK_2']);
    return this;
  }

  /**
   * Send data to hardware and flush buffer
   * @return {[Promise]}
   */
  flush(): Promise<this> {
    return new Promise((resolve, reject) => {
      const buf = this.buffer.flush();
      this.conexion.transfer(buf, (error) => {
        if (error) reject(error);
        else resolve(this);
      });
    });
  }

  /**
   * Cut paper
   * @param  {[boolean]} partial set a full or partial cut. Default: full Partial cut is not implemented in all printers
   * @param  {[number]} feed Number of lines to feed before cutting
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  cut(partial = true, feed = 3) {
    console.log(partial);
    this.lineaVacia(feed);
    this.buffer.write(PAPER[partial ? 'PAPER_PART_CUT' : 'PAPER_FULL_CUT']);
    return this;
  }

  async desconectar(): Promise<this> {
    await this.flush();
    return new Promise((resolve, reject) => {
      if (!this.dispositivo) return;
      try {
        this.dispositivo.close();
        this.conexion.removeAllListeners('detach');
        resolve(this);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * [color select between two print color modes, if your printer supports it]
   * @param  {Number} color - 0 for primary color (black) 1 for secondary color (red)
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  color(color: 0 | 1) {
    if (color !== 0 && color !== 1) {
      console.warn(`Unknown color ${color}`);
      this.buffer.write(COLOR[0]);
    } else this.buffer.write(COLOR[color]);
    return this;
  }

  /**
   * [reverse colors, if your printer supports it]
   * @param {Boolean} reverse - True for reverse, false otherwise
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  setReverseColors(reverse: boolean) {
    this.buffer.write(reverse ? COLOR.REVERSE : COLOR.UNREVERSE);
    return this;
  }

  /**
   * [writes a low level command to the printer buffer]
   *
   * @usage
   * 1) raw('1d:77:06:1d:6b:02:32:32:30:30:30:30:32:30:30:30:35:30:35:00:0a')
   * 2) raw('1d 77 06 1d 6b 02 32 32 30 30 30 30 32 30 30 30 35 30 35 00 0a')
   * 3) raw(Buffer.from('1d77061d6b0232323030303032303030353035000a','hex'))
   *
   * @param data {Buffer|string}
   * @returns {Printer}
   */
  raw(data: Buffer | string) {
    if (Buffer.isBuffer(data)) {
      this.buffer.write(data);
    } else if (typeof data === 'string') {
      data = data.toLowerCase();
      this.buffer.write(Buffer.from(data.replace(/(\s|:)/g, ''), 'hex'));
    }
    return this;
  }

  // /**
  //  * get one specific status from the printer using it's class
  //  * @param  {string} statusClass
  //  * @return {Promise} promise returning given status
  //  */
  // getStatus<T extends DeviceStatus>(statusClass: StatusClassConstructor<T>): Promise<T> {
  //   return new Promise((resolve) => {
  //     this.adapter.read((data) => {
  //       const byte = data.readInt8(0);
  //       resolve(new statusClass(byte));
  //     });

  //     statusClass.commands().forEach((c) => {
  //       this.buffer.write(c);
  //     });
  //   });
  // }

  /**
   * get statuses from the printer
   * @return {Promise}
   */
  // getStatuses() {
  //   return new Promise((resolve) => {
  //     this.adapter.read((data) => {
  //       let buffer: number[] = [];
  //       for (let i = 0; i < data.byteLength; i++) buffer.push(data.readInt8(i));
  //       if (buffer.length < 4) return;

  //       let statuses = [
  //         new PrinterStatus(buffer[0]),
  //         new RollPaperSensorStatus(buffer[1]),
  //         new OfflineCauseStatus(buffer[2]),
  //         new ErrorCauseStatus(buffer[3]),
  //       ];
  //       resolve(statuses);
  //     });

  //     [PrinterStatus, RollPaperSensorStatus, OfflineCauseStatus, ErrorCauseStatus].forEach((statusClass) => {
  //       statusClass.commands().forEach((command) => {
  //         this.adapter.write(command);
  //       });
  //     });
  //   });
  // }

  /**
   * STAR printer - Paper cut instruction
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  starFullCut() {
    this.buffer.write(PAPER.STAR_FULL_CUT);
    return this;
  }

  /**
   * STAR printer - Select emphasized printing
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  emphasize() {
    this.buffer.write(TEXT_FORMAT.STAR_TXT_EMPHASIZED);
    return this;
  }

  /**
   * STAR printer - Cancel emphasized printing
   * @return {[Printer]} printer  [the escpos printer instance]
   */
  cancelEmphasize() {
    this.buffer.write(TEXT_FORMAT.STAR_CANCEL_TXT_EMPHASIZED);
    return this;
  }
}

// export { default as Image } from './image';
