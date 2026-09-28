// Royal ARK static Telegram sticker. Rendered server-side as WEBP; no third-party image URLs.
import sharp from 'sharp';
export async function makeArkAdminSticker() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+
    '<defs><radialGradient id="n"><stop offset="0" stop-color="#244a72"/><stop offset="1" stop-color="#11283f"/></radialGradient></defs>'+
    '<circle cx="256" cy="256" r="217" fill="url(#n)" stroke="#F1C878" stroke-width="11"/>'+
    '<circle cx="256" cy="256" r="194" fill="none" stroke="#8d733e" stroke-width="2"/>'+
    '<path d="M256 80l17 38 42 3-32 27 10 42-37-22-37 22 10-42-32-27 42-3z" fill="#F1C878"/>'+
    '<text x="256" y="296" text-anchor="middle" font-family="Arial, sans-serif" font-size="118" font-weight="900" letter-spacing="-4" fill="#ffffff">ARK</text>'+
    '<rect x="123" y="322" width="266" height="5" rx="3" fill="#F1C878"/>'+
    '<text x="256" y="372" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="2" fill="#F7DDA0">ATTENDANCE</text>'+
    '</svg>';
  return sharp(Buffer.from(svg)).webp({quality:86,effort:5}).toBuffer();
}