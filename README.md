`LIBUSB_ERROR_ACCESS`

Este comando se puede usar para probar, pero se pierde cuando se desconecta la impresora. Al no persistir es útil sólo para pruebas.

```bash
sudo chmod -R 777 /dev/bus/usb/
```

Este si persiste, asignamos el usuario como dueño de los puertos USB.

Crear archivo

```bash
sudo nano /etc/udev/rules.d/impresora.rules
```

con el siguiente contenido

```bash
SUBSYSTEMS=="usb", MODE="0660", GROUP="grupoenflujo"
```

subirse a sudo

```bash
sudo su
```

crear grupo:

```bash
groupadd -r grupoenflujo
```

asignar usuario al grupo:

```bash
usermod -a -G grupoenflujo enflujo
```

reiniciar `udev`

```bash
sudo udevadm trigger
```

```bash
sudo cat /sys/kernel/debug/usb/devices | grep -E "^([TSPD]:.*|)$"
```

```bash
lsusb -v
```

Para usar `canvas` en nodejs, instalar dependencias para Raspberry:

```bash
sudo apt install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```
