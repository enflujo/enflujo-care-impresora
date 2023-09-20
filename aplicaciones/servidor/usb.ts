import os from 'os';
import usb, { Device, Endpoint, OutEndpoint } from 'usb';

const TiposDispositivo = {
  AUDIO: 0x01,
  HID: 0x03,
  IMPRESORA: 0x07,
  HUB: 0x09,
};

export default class USB {
  endpoint: Endpoint;
  dispositivo: Device;

  constructor(vid?, pid?) {
    if (vid && pid) {
      this.dispositivo = usb.findByIds(vid, pid);
    } else {
      const impresora = this.buscarImpresora();

      if (impresora && impresora.length) {
        this.dispositivo = impresora[0];
      }
    }

    if (!this.dispositivo) throw new Error('No se encontró ninguna impresora conectada');
  }

  buscarImpresora() {
    return usb.getDeviceList().filter((dispositivo) => {
      try {
        return dispositivo.configDescriptor.interfaces.filter((interfaz) => {
          return interfaz.filter((config) => config.bInterfaceClass === TiposDispositivo.IMPRESORA).length;
        }).length;
      } catch (e) {
        return false;
      }
    });
  }

  inciar(): Promise<void> {
    let counter = 0;

    return new Promise((resolver, rechazar) => {
      try {
        this.dispositivo.open();

        this.dispositivo.interfaces.forEach((interfaz) => {
          interfaz.setAltSetting(interfaz.altSetting, () => {
            try {
              // http://libusb.sourceforge.net/api-1.0/group__dev.html#gab14d11ed6eac7519bb94795659d2c971
              // libusb_kernel_driver_active / libusb_attach_kernel_driver / libusb_detach_kernel_driver : "This functionality is not available on Windows."
              if ('win32' !== os.platform()) {
                if (interfaz.isKernelDriverActive()) {
                  try {
                    interfaz.detachKernelDriver();
                  } catch (e) {
                    console.error('[ERROR] Could not detatch kernel driver: %s', e);
                  }
                }
              }

              interfaz.claim();

              interfaz.endpoints.filter((endpoint) => {
                if (endpoint.direction == 'out' && !this.endpoint) {
                  this.endpoint = endpoint;
                }
              });

              if (this.endpoint) {
                resolver();
              } else if (++counter === this.dispositivo.interfaces.length && !this.endpoint) {
                rechazar();
              }
            } catch (e) {
              rechazar(e);
            }
          });
        });
      } catch (error) {
        rechazar(error);
        throw new Error(JSON.stringify(error, null, 2));
      }
    });
  }

  write(data, callback) {
    (this.endpoint as OutEndpoint).transfer(data, callback);
    return this;
  }

  close(callback) {
    if (this.dispositivo) {
      try {
        this.dispositivo.close();
        // usb.removeAllListeners('detach');

        callback && callback(null);
      } catch (e) {
        callback && callback(e);
      }
    } else {
      callback && callback(null);
    }

    return this;
  }
}
