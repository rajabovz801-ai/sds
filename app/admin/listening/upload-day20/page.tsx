import AdminBack from "../../admin-back";
import Day20AudioUploader from "../day20-audio-uploader";
export default function Page(){return <main style={{minHeight:"100vh",background:"#f5f7f9",padding:"28px 18px"}}><section style={{maxWidth:900,margin:"auto"}}><AdminBack href="/admin/listening" ariaLabel="Back to Listening reports"/><h1>Day 20 · TEST 154 Audio</h1><p>Upload the verified MP3 directly to Supabase Storage.</p><Day20AudioUploader/><style>{`
.la-upload-panel{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px;background:white;border:1px solid #dce4ed;border-radius:14px}
.la-upload-copy{display:flex;align-items:center;gap:15px}.la-upload-copy svg{color:#2754b8}
.la-upload-copy p{font-size:13px;color:#65768a}.la-upload-copy small{font-size:12px;color:#226b4f}
.la-upload-actions{display:flex;gap:10px;flex-wrap:wrap}
.la-upload-select,.la-upload-actions button{border-radius:8px;background:#2859c4;color:white;border:1px solid #2859c4;padding:11px 13px;cursor:pointer;font-size:12px;font-weight:700}
.la-upload-select input{display:none}.la-upload-actions button{background:white;color:#2859c4}
.la-upload-select.disabled,.la-upload-actions button:disabled{opacity:.5;pointer-events:none}
@media(max-width:650px){.la-upload-panel{flex-direction:column;align-items:stretch}}
`}</style></section></main>}
