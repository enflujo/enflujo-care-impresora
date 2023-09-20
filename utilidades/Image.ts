import getPixels from 'get-pixels';
import { NdArray } from 'ndarray';

export type ImageMimeType = 'image/png' | 'image/jpg' | 'image/jpeg' | 'image/gif' | 'image/bmp';
const ESC_INIT = [0x1b, 0x40];
const ESC_BIT_IMAGE = [0x1b, 0x2a];
const DOTS_DENSITY = 24;
const LUMINANCE = {
  RED: 0.299,
  GREEN: 0.587,
  BLUE: 0.114,
};
const LINE_FEED = 0x0a;

function calculateLuminance(pixel) {
  return LUMINANCE.RED * pixel[0] + LUMINANCE.GREEN * pixel[1] + LUMINANCE.BLUE * pixel[2];
}

function calculateSlice(x, y, image) {
  const threshold = 127;
  let slice = 0;

  for (let bit = 0; bit < 8; bit++) {
    if (y + bit >= image.length) continue;

    const luminance = calculateLuminance(image[y + bit][x]);

    slice |= (luminance < threshold ? 1 : 0) << (7 - bit);
  }

  return slice;
}

function collectStripe(x: number, y: number, image) {
  const slices = [];
  const z = y + DOTS_DENSITY;

  let i = 0;
  while (y < z && i < 3) {
    slices.push(calculateSlice(x, y, image));

    y += 8;
  }

  return slices;
}

function manipulateImage(image: NdArray<Uint8Array>) {
  let data = [];
  const imageWidth = image.shape[0];

  for (let y = 0; y < image.data.length; y += DOTS_DENSITY) {
    data.push(...ESC_BIT_IMAGE, 33, 0x00ff & imageWidth, (0xff00 & imageWidth) >> 8);

    for (let x = 0; x < imageWidth; x++) {
      data.push(...collectStripe(x, y, image.data[x]));
    }

    data.push(LINE_FEED);
  }

  return data;
}

function printImage(image: NdArray<Uint8Array>) {
  let transformedImage = [];
  transformedImage.push(...ESC_INIT);
  transformedImage.push(...manipulateImage(image));
  return new Uint8Array(transformedImage);
}

export default class Image {
  private readonly pixels: NdArray<Uint8Array>;
  private readonly data: boolean[] = [];

  constructor(pixels: NdArray<Uint8Array>) {
    this.pixels = pixels;
    // console.log(manipulateImage(pixels));
    //   this.data = [];
    // function rgb(pixel) {
    //   return {
    //     r: pixel[0],
    //     g: pixel[1],
    //     b: pixel[2],
    //     a: pixel[3]
    //   };
    // };

    // var self = this;
    // for(var i=0;i<this.pixels.data.length;i+=this.size.colors){
    //   this.data.push(rgb(new Array(this.size.colors).fill(0).map(function(_, b){
    //     return self.pixels.data[ i + b ];
    //   })));
    // };

    // this.data = this.data.map(function(pixel) {
    //  if (pixel.a == 0) return 0;
    //  var shouldBeWhite = pixel.r > 200 && pixel.g > 200 && pixel.b > 200;
    //  return shouldBeWhite ? 0 : 1;
    // });

    const rgbaData: number[][] = [];

    for (let i = 0; i < this.pixels.data.length; i += this.size.colors) {
      rgbaData.push(new Array(this.size.colors).fill(0).map((_, b) => this.pixels.data[i + b]));
    }
    const corte = 200;

    this.data = rgbaData.map(([r, g, b, a]) => {
      // const luminancia = calculateLuminance([r, g, b, a]);
      // return luminancia < corte;
      // console.log(calculateLuminance([r, g, b, a]));
      return a != 0 && r < corte && g < corte && b < corte;
    });
  }

  private get size() {
    return {
      width: this.pixels.shape[0],
      height: this.pixels.shape[1],
      colors: this.pixels.shape[2],
    };
  }

  toBitmap(density: number = 24) {
    const result: number[][] = [];
    let x = 0;
    let y = 0;
    let b = 0;
    let l = 0;
    let i = 0;
    const c = density / 8;

    let n = Math.ceil(this.size.height / density);

    for (y = 0; y < n; y++) {
      // line data
      const ld: number[] = [];

      for (x = 0; x < this.size.width; x++) {
        for (b = 0; b < density; b++) {
          i = x * c + (b >> 3);

          if (ld[i] === undefined) ld[i] = 0;

          l = y * density + b;

          if (l < this.size.height) {
            if (this.data[l * this.size.width + x]) {
              ld[i] += 0x80 >> (b & 0x7);
            }
          }
        }
      }

      result[y] = ld;
    }

    return {
      data: result,
      density: density,
    };
  }

  toRaster() {
    const result = [];
    const { width, height } = this.size;

    // n blocks of lines
    const n = Math.ceil(width / 8);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < n; x++) {
        for (let b = 0; b < 8; b++) {
          const i = x * 8 + b;

          if (result[y * n + x] === undefined) {
            result[y * n + x] = 0;
          }

          const c = x * 8 + b;

          if (c < width) {
            if (this.data[y * width + i]) {
              result[y * n + x] += 0x80 >> (b & 0x7);
            }
          }
        }
      }
    }
    return {
      data: result,
      width: n,
      height: height,
    };
  }

  static load(url: string, type: ImageMimeType | null = null): Promise<Image> {
    return new Promise((resolve, reject) => {
      getPixels(url, type ?? '', (error, pixels) => {
        if (error) reject(error);
        else resolve(new Image(pixels));
      });
    });
  }
}
