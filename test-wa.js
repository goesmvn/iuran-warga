fetch('http://127.0.0.1:3088/api/whatsapp/status', {
  headers: {
    'Authorization': 'Bearer test'
  }
}).then(r => r.json()).then(console.log).catch(console.error);
