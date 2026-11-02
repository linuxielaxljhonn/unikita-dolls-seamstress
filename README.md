# Unikita Dolls Seamstress — app instalable (PWA)

Generador de patrones de costura a medida para muñecas. Funciona en móvil, tableta y ordenador, se instala como una app y trabaja sin conexión.

**App publicada:** https://linuxielaxljhonn.github.io/unikita-dolls-seamstress/

## 1. Publicarla (una sola vez)

1. Descomprime este ZIP. Obtendrás una carpeta con `index.html` y el resto de archivos.
2. Crea una cuenta gratuita en <https://www.netlify.com> (con la cuenta el sitio queda guardado; sin ella, Netlify lo borra al cabo de un rato).
3. Entra en <https://app.netlify.com/drop> y **arrastra la carpeta** (la que contiene `index.html`, no una carpeta superior).
4. Netlify te da una dirección `algo.netlify.app`. Puedes cambiar el nombre en *Site configuration → Change site name*, por ejemplo `unikita-dolls.netlify.app`.

También funciona en GitHub Pages o en cualquier hosting con **HTTPS** (sin HTTPS no se puede instalar).

## 2. Instalarla

- **Android / Chrome / Edge:** abre la dirección y pulsa **"Instalar la app"** (o menú ⋮ → *Instalar aplicación*).
- **iPhone / iPad:** en **Safari**, botón *Compartir* → **"Añadir a pantalla de inicio"**.
- **Ordenador (Chrome/Edge):** icono de instalar en la barra de direcciones.

## 3. Publicar una versión nueva

1. Haz los cambios en los archivos.
2. Sube el número de versión en **dos sitios**:
   - `sw.js` → `const VERSION = '1.0.1';`
   - `index.html` → `const APP_VERSION='1.0.1';`
3. En Netlify, abre tu sitio → **Deploys** → arrastra la carpeta otra vez a la zona de *drag and drop*.

Quien tenga la app abierta verá el aviso **"Hay una versión nueva de Unikita · Actualizar"**.

## 4. Diseños de las compañeras (catálogo común)

1. Cada diseñadora prepara su prenda en el **Generador**: elige una prenda base o *Diseño libre*, ajusta el modo manual y añade sus **Piezas a medida** (rectángulo, trapecio, arco o por puntos, en cm y sin margen).
2. En **Mis diseños** pulsa *Guardar diseño* y después **Enviar** (comparte el archivo `.unikita.json`, por ejemplo por WhatsApp) o **Código** (texto para pegar).
3. Tú los importas en *Mis diseños → Recibir diseños*.
4. Pulsa **"Descargar disenos.json"**, sustituye el archivo `disenos.json` de esta carpeta y vuelve a subir la carpeta a Netlify.
   - Para esto **no** hace falta cambiar la versión: el catálogo común se descarga de nuevo cada vez que se abre la app con conexión.

Los diseños propios y las muñecas guardadas se quedan en cada dispositivo. Para no perderlos, expórtalos.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación (interfaz) |
| `engine.js` | Motor de patronaje (bloques, prendas, márgenes) |
| `data.js` | Base de datos de medidas de muñecas |
| `illustrate.js` | Figurines del catálogo visual |
| `disenos.json` | Catálogo común de diseños |
| `sw.js` | Service worker: modo sin conexión y actualizaciones |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png`, `logo.png` | Instalación e iconos |

## Próximo paso (opción 2)

Cuando quieras pasar a FreeSewing, cada prenda de `engine.js` equivale a un *design* de FreeSewing. Los bloques (`bodice`, `sleeve`, `skirt`, `pants`) se pueden portar como *parts*, y las medidas de `data.js` como *measurement sets*.

## Publicación en GitHub Pages

Este repositorio se publica con GitHub Pages (rama `main`, carpeta raíz). Para actualizar:
**Add file → Upload files**, sube los archivos cambiados y pulsa *Commit changes*. En 1–2 minutos estará en línea.
Si cambias el código, sube antes `VERSION` en `sw.js` y `APP_VERSION` en `index.html`.
