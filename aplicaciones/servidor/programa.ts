import type { OutEndpoint } from 'usb';
import { buscarImpresora, conectar } from './utilidades/ayudas.js';
import { Impresora } from './utilidades/Impresora.js';
import Image from './utilidades/Image.js';
import { createCanvas } from 'canvas';
import { createWriteStream } from 'fs';
import * as url from 'url';
import { resolve } from 'path';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function inicio() {
  const dispositivo = buscarImpresora();

  if (dispositivo) {
    const conexion = await conectar(dispositivo);
    const impresora = new Impresora(dispositivo, conexion, { encoding: 'Cp858' });
    const rutaFoto = './imgs/resistencia.png';
    const foto = await Image.load(rutaFoto);
    const vaquita = `
         __n__n__
  .------\`-\\00/-'
 /  ##  ## (oo)
/ \\## __   ./
   |//YY \\|/
     |||   |||
  `;
    const gato = `

  /\\_____/\\
 /  o   o  \\
( ==  ^  == )
 )         (
(           )
( (  )   (  ) )
(__(__)___(__)__)`;

    // Imprimir los dibujitos de arriba
    impresora.align('ct').espacioEntreLinea(0).text(vaquita);
    impresora.cut().desconectar();

    // impresora
    //   .align('ct')
    //   .image(foto, 'd24')
    //   .then(() => {
    //     impresora.cut().desconectar();
    //   });
  }

  function escribir(impresora: OutEndpoint, datos: Buffer) {
    impresora.transfer(datos);
  }

  //   // const conexion = await conectar(impresora);
  //   const impresora = await WebUSBDevice.createInstance(instanciaImpresora);
  //   if (impresora) {
  //     await conectarImpresora(impresora);
  //     console.log('conexion');
  //   } else {
  //     console.log('No se pudo convertir instancia de impresora a WebUSB');
  //   }
  // } else {
  //   console.log('No hay impresora conectada');
  // }
}

inicio().catch(console.error);

// import escpos from 'escpos';
// import USB from './usb.js';
// inicio();

// async function inicio() {
//   const usb = new USB();
//   await usb.inciar();
//   const opciones = { encoding: 'GB18030' /* default */ };
//   const impresora = new escpos.Printer(usb, opciones);
//   const rutaImg = './diegoamelio.png';

//   escpos.Image.load(rutaImg, async (img) => {
//     impresora
//       .align('ct')
//       .image(img, 'd24')
//       .then(() => {
//         impresora.cut().close();
//       });
//   });
// }
