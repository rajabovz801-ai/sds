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
const xml = value => String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export async function makeAttendancePreview(report) {
  const t=report.totals;
  const rows=report.groups.slice(0,4).map((g,i)=>{
    const y=486+i*62;
    return '<rect x="65" y="'+y+'" width="1070" height="53" rx="13" fill="#223d5c"/>'+
      '<text x="91" y="'+(y+34)+'" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="#ffffff">'+xml(g.name.slice(0,36))+'</text>'+
      '<text x="780" y="'+(y+34)+'" font-family="Arial, sans-serif" font-size="21" fill="#98edc1">'+g.present+' KELDI</text>'+
      '<text x="945" y="'+(y+34)+'" font-family="Arial, sans-serif" font-size="21" fill="#ffb2b2">'+g.absent+' KELMADI</text>';
  }).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="790">'+
    '<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#122741"/><stop offset="1" stop-color="#225174"/></linearGradient></defs>'+
    '<rect width="1200" height="790" rx="36" fill="url(#bg)"/>'+
    '<path d="M65 63h12v33H65z" fill="#f5be6c"/><text x="100" y="90" font-family="Arial,sans-serif" font-size="26" font-weight="800" letter-spacing="4" fill="#f5cd84">ARK EDUCATION CENTRE</text>'+
    '<text x="65" y="181" font-family="Arial,sans-serif" font-weight="800" font-size="64" fill="#ffffff">DAILY ATTENDANCE</text>'+
    '<text x="69" y="228" font-family="Arial,sans-serif" font-size="25" fill="#cbddeb">'+xml(report.date)+'  |  BARCHA GURUHLAR</text>'+
    '<rect x="65" y="270" rx="20" width="330" height="162" fill="#eef8f1"/>'+
    '<rect x="425" y="270" rx="20" width="330" height="162" fill="#fff1f1"/>'+
    '<rect x="785" y="270" rx="20" width="350" height="162" fill="#fff6e3"/>'+
    '<text x="93" y="347" font-family="Arial,sans-serif" font-weight="900" font-size="76" fill="#138556">'+t.present+'</text>'+
    '<text x="93" y="392" font-family="Arial,sans-serif" font-weight="700" font-size="24" fill="#316e58">KELDI</text>'+
    '<text x="455" y="347" font-family="Arial,sans-serif" font-weight="900" font-size="76" fill="#c54b52">'+t.absent+'</text>'+
    '<text x="455" y="392" font-family="Arial,sans-serif" font-weight="700" font-size="24" fill="#aa5960">KELMADI</text>'+
    '<text x="815" y="347" font-family="Arial,sans-serif" font-weight="900" font-size="76" fill="#ae791e">'+report.percent+'%</text>'+
    '<text x="815" y="392" font-family="Arial,sans-serif" font-weight="700" font-size="24" fill="#977a44">DAVOMAT</text>'+
    '<text x="68" y="466" font-family="Arial,sans-serif" font-weight="800" font-size="22" fill="#d4e5f2">GURUHLAR KESIMIDA</text>'+
    rows+(report.groups.length>4?'<text x="71" y="763" font-family="Arial,sans-serif" font-size="17" fill="#e7b969">+'+(report.groups.length-4)+' ta guruh HTML hisobotda</text>':'')+
    '</svg>';
  return sharp(Buffer.from(svg)).png().toBuffer();
}
