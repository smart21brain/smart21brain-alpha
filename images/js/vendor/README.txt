Third-party libraries used by Smart21Shop QR tags (kept in the project so the till and the
label printer work without depending on a CDN).

qrcode.min.js  — "QR Code Generator for JavaScript" 1.4.4 by Kazuhiko Arase. MIT licence
                 (notice kept at the top of the file). https://github.com/kazuhikoarase/qrcode-generator
jsQR.min.js    — jsQR 1.4.0 by Cosmo Wolfe. Apache-2.0 licence
                 (short notice at the top of the file, full text in LICENSE-jsQR.txt). https://github.com/cozmo/jsQR

"QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
Both files are the upstream releases, minified with terser. To update: npm install the package,
minify, replace the file, and run tests/shop-qr.test.mjs.
