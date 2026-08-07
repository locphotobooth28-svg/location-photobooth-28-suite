const express=require('express');
const app=express();
const PORT=process.env.PORT||3000;
app.use(express.static('public'));
app.get('/',(req,res)=>res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Location Photobooth 28 Suite</title><style>body{background:#111;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column}h1{color:#D4AF37}</style></head><body><h1>📸 Location Photobooth 28 Suite</h1><p>Version 5.0.0</p></body></html>`));
app.listen(PORT,()=>console.log('Serveur démarré'));