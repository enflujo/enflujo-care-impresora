import { Device, getDeviceList } from 'usb';
import type { OutEndpoint } from 'usb';
import { INTERFACES } from './constantes';
import { platform } from 'os';

export function buscarImpresora() {
  const impresoras = getDeviceList().filter(({ configDescriptor }) => {
    try {
      const impresoras = configDescriptor?.interfaces.filter((interfaz) => {
        return interfaz.filter(({ bInterfaceClass }) => bInterfaceClass === INTERFACES.IMPRESORA).length;
      });

      return impresoras.length;
    } catch (error) {
      console.error(error);
      throw new Error('No hay impresoras conectadas por USB.');
    }
  });

  if (impresoras.length) return impresoras[0];
  return null;
}

export function conectar(impresora: Device): Promise<OutEndpoint | null> {
  return new Promise((resolver, rechazar) => {
    impresora.open();

    impresora.interfaces.forEach((interfaz) => {
      interfaz.setAltSetting(interfaz.altSetting, () => {
        try {
          if ('win32' !== platform()) {
            if (interfaz.isKernelDriverActive()) {
              try {
                interfaz.detachKernelDriver();
              } catch (e) {
                rechazar('No se puede reclamar interfaz de la imporesora.');
                return;
              }
            }
          }

          interfaz.claim();

          for (let i = 0; i < interfaz.endpoints.length; i++) {
            const puntoConexion = interfaz.endpoints[i];

            if (puntoConexion.direction == 'out') {
              resolver(puntoConexion as OutEndpoint);
              return;
            }
          }

          rechazar('No se pudo conectar a la impresora.');
        } catch (error) {
          rechazar(error);
        }
      });
    });
  });
}

export function getParityBit(str: string) {
  let parity = 0;
  let reversedCode = str.split('').reverse().join('');
  for (let counter = 0; counter < reversedCode.length; counter += 1) {
    parity += parseInt(reversedCode.charAt(counter), 10) * Math.pow(3, (counter + 1) % 2);
  }
  return ((10 - (parity % 10)) % 10).toString();
}

export function codeLength(str: string) {
  const hex = Number(str.length).toString(16).padStart(2, '0');
  let buff = Buffer.from(hex, 'hex');
  return buff.toString();
}

export function charLength(char: string) {
  const code = char.charCodeAt(0);
  return code > 0x7f && code <= 0xffff ? 2 : 1; // More than 2bytes count as 2
}

export function textLength(str: string) {
  return str.split('').reduce((accLen, char) => {
    return accLen + charLength(char);
  }, 0);
}

export function textSubstring(str: string, start: number, end?: number) {
  let accLen = 0;
  return str.split('').reduce((accStr, char) => {
    accLen = accLen + charLength(char);
    return accStr + (accLen > start && (!end || accLen <= end) ? char : '');
  }, '');
}

export function upperCase<T extends string>(string: T): Uppercase<T> {
  return string.toUpperCase() as Uppercase<T>;
}

export type AnyCase<T extends string> = Uppercase<T> | Lowercase<T>;

export function isKey<T extends {} | []>(key: string | number | symbol, of: T): key is keyof T {
  return key in of;
}
