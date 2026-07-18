/**
 * Barcode/QR formats supported by the scanner. These string values map 1:1 to
 * expo-camera's `BarcodeType`, so they can be passed straight into
 * `barcodeScannerSettings.barcodeTypes`.
 */
export const CODE_FORMATS = [
    'qr',
    'ean13',
    'ean8',
    'code128',
    'code39',
    'code93',
    'codabar',
    'itf14',
    'upc_a',
    'upc_e',
    'pdf417',
    'aztec',
    'datamatrix',
];
/** Human-readable labels for each format, used in the config UI. */
export const CODE_FORMAT_LABELS = {
    qr: 'QR Code',
    ean13: 'EAN-13',
    ean8: 'EAN-8',
    code128: 'Code 128',
    code39: 'Code 39',
    code93: 'Code 93',
    codabar: 'Codabar',
    itf14: 'ITF-14',
    upc_a: 'UPC-A',
    upc_e: 'UPC-E',
    pdf417: 'PDF417',
    aztec: 'Aztec',
    datamatrix: 'Data Matrix',
};
