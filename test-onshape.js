require('dotenv').config({ path: '.dev.vars' });
const crypto = require('crypto');

async function signRequest(secretKey, method, urlPath, query, nonce, date, contentType) {
  const str = `${method}\n${nonce}\n${date}\n${contentType}\n${urlPath}\n${query}\n`.toLowerCase();
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(str);
  return hmac.digest('base64');
}

function generateNonce() {
  return crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

async function run() {
  const accessKey = process.env.ONSHAPE_ACCESS_KEY;
  const secretKey = process.env.ONSHAPE_SECRET_KEY;
  const url = process.env.ONSHAPE_URL;
  
  const match = url.match(/\/documents\/([^\/]+)\/v\/([^\/]+)\/e\/([^\/]+)/);
  const did = match[1];
  const vid = match[2];
  const eid = match[3];


  const method = 'POST';
  const query = '';
  const nonce = generateNonce();
  const date = new Date().toUTCString();
  const contentType = 'application/json';

  const rails = 2;
  const spacing = 50;
  const headDistance = 20;
  const footDistance = 20;
  const footPadHeight = 5;
  const freestandingFoot = true;
  const frontFootRail = true;
  const backFootRail = true;
  const frontFootDepth = 40;
  const backFootDepth = 40;

  const configurationStr = `Count=${rails};Gap=${spacing/1000}+meter;ExtraTop=${headDistance/1000}+meter;ExtraBottom=${footDistance/1000}+meter;FootPadHeight=${footPadHeight/1000}+meter;IncludeFoot=${freestandingFoot};FrontFootDIN=${frontFootRail};BackFootDIN=${backFootRail};FrontFootDepth=${frontFootDepth/1000}+meter;BackFootDepth=${backFootDepth/1000}+meter`;
  
  const apiPath = `/api/partstudios/d/${did}/v/${vid}/e/${eid}/export/gltf`;
  const translationPayload = {
    destinationName: 'model.glb',
    storeInDocument: false,
    grouping: true,
    advancedParams: {
      configuration: configurationStr,
      useGlbCompression: true
    }
  };
  const signature = await signRequest(secretKey, method, apiPath, query, nonce, date, contentType);
  const authHeader = `On ${accessKey}:HmacSHA256:${signature}`;

  console.log('Starting translation...');
  const res = await fetch(`https://cad.onshape.com${apiPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Date': date,
      'On-Nonce': nonce,
      'Authorization': authHeader,
      'Accept': 'application/vnd.onshape.v1+json'
    },
    body: JSON.stringify(translationPayload)
  });

  const data = await res.json();
  console.log('Translation started:', data);
  const tid = data.id;

  let downloadUrl = null;
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 2000));
    attempts++;

    const pollPath = `/api/translations/${tid}`;
    const pNonce = generateNonce();
    const pDate = new Date().toUTCString();
    const pSig = await signRequest(secretKey, 'GET', pollPath, '', pNonce, pDate, 'application/json');
    const pAuth = `On ${accessKey}:HmacSHA256:${pSig}`;

    const pollRes = await fetch(`https://cad.onshape.com${pollPath}`, {
      headers: {
        'Content-Type': 'application/json',
        'Date': pDate,
        'On-Nonce': pNonce,
        'Authorization': pAuth,
        'Accept': 'application/vnd.onshape.v1+json'
      }
    });

    const pData = await pollRes.json();
    console.log(`Poll ${attempts}: pData=`, pData);
    if (pData.requestState === 'DONE') {
      const extDataId = pData.resultExternalDataIds && pData.resultExternalDataIds[0];
      if (extDataId) {
        downloadUrl = `https://cad.onshape.com/api/documents/d/${did}/externaldata/${extDataId}`;
      } else {
        downloadUrl = `https://cad.onshape.com/api/translations/${tid}/download`;
      }
      console.log('DONE object:', JSON.stringify(pData, null, 2));
      break;
    } else if (pData.requestState === 'FAILED') {
      console.log('FAILED object:', JSON.stringify(pData, null, 2));
      break;
    }
  }

  if (downloadUrl) {
    console.log('Trying to download from', downloadUrl);
    const downloadPath = downloadUrl.replace('https://cad.onshape.com', '');
    const dlNonce = generateNonce();
    const dlDate = new Date().toUTCString();
    const dlSig = await signRequest(secretKey, 'GET', downloadPath, '', dlNonce, dlDate, '');
    const dlAuth = `On ${accessKey}:HmacSHA256:${dlSig}`;

    const dlRes = await fetch(downloadUrl, {
      headers: {
        'Date': dlDate,
        'On-Nonce': dlNonce,
        'Authorization': dlAuth
      },
      redirect: 'manual'
    });

    console.log('Download response status:', dlRes.status);
    if (dlRes.ok) {
      console.log('Download SUCCESS!');
      const buf = await dlRes.arrayBuffer();
      console.log('Downloaded bytes:', buf.byteLength);
      require('fs').writeFileSync('test.bin', Buffer.from(buf));
    } else {
      console.log('Download body:', await dlRes.text());
    }
  }
}

run().catch(console.error);
