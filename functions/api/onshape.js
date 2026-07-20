function generateNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 25; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

async function signRequest(secretKey, method, urlPath, query, nonce, date, contentType) {
  const str = `${method}\n${nonce}\n${date}\n${contentType}\n${urlPath}\n${query}\n`.toLowerCase();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(str)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function generateHash(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const accessKey = env.ONSHAPE_ACCESS_KEY;
  const secretKey = env.ONSHAPE_SECRET_KEY;
  const onshapeUrl = env.ONSHAPE_URL;
  const modelCache = env.MODEL_CACHE;

  if (!accessKey || !secretKey || !onshapeUrl || !modelCache) {
    return new Response('Missing Onshape configuration in environment variables.', { status: 500 });
  }

  try {
    const payload = await request.json();
    const format = payload.format || 'glb'; // 'glb' or 'stl'
    const formatName = format.toUpperCase() === 'STL' ? 'STL' : 'GLTF';

    // Parse URL: /documents/did/v/vid/e/eid
    const match = onshapeUrl.match(/\/documents\/([^\/]+)\/v\/([^\/]+)\/e\/([^\/]+)/);
    if (!match) {
        return new Response('Invalid ONSHAPE_URL in environment.', { status: 500 });
    }
    const did = match[1];
    const vid = match[2];
    const eid = match[3];

    // Validation
    const rawRails = typeof payload.numRails === 'number' ? payload.numRails : parseFloat(payload.numRails) || 1;
    const rawSpacing = typeof payload.spacing === 'number' ? payload.spacing : parseFloat(payload.spacing) || 35;
    const rawHead = typeof payload.headDistance === 'number' ? payload.headDistance : parseFloat(payload.headDistance) || 10;
    const rawFoot = typeof payload.footDistance === 'number' ? payload.footDistance : parseFloat(payload.footDistance) || 10;
    
    // Snap and limit
    const rails = Math.min(5, Math.max(1, Math.round(rawRails)));
    const spacing = Math.min(100, Math.max(20, Math.round(rawSpacing / 5) * 5));
    const headDistance = Math.min(50, Math.max(0, Math.round(rawHead / 10) * 10));
    const footDistance = Math.min(50, Math.max(0, Math.round(rawFoot / 10) * 10));
    const footPadHeight = 5;
    
    // Checkboxes
    const freestandingFoot = payload.freestandingFoot === true || payload.freestandingFoot === 'true' ? true : false;
    const frontFootRail = payload.frontFootRail === true || payload.frontFootRail === 'true' ? true : false;
    const backFootRail = payload.backFootRail === true || payload.backFootRail === 'true' ? true : false;

    const rawFrontFootDepth = typeof payload.frontFootDepth === 'number' ? payload.frontFootDepth : parseFloat(payload.frontFootDepth) || 40;
    const rawBackFootDepth = typeof payload.backFootDepth === 'number' ? payload.backFootDepth : parseFloat(payload.backFootDepth) || 40;

    const frontFootDepth = Math.min(80, Math.max(20, Math.round(rawFrontFootDepth / 10) * 10));
    const backFootDepth = Math.min(80, Math.max(20, Math.round(rawBackFootDepth / 10) * 10));

    // Generate configuration string
    const configurationStr = `Count=${rails};Gap=${spacing/1000}+meter;ExtraTop=${headDistance/1000}+meter;ExtraBottom=${footDistance/1000}+meter;FootPadHeight=${footPadHeight/1000}+meter;IncludeFoot=${freestandingFoot};FrontFootDIN=${frontFootRail};BackFootDIN=${backFootRail};FrontFootDepth=${frontFootDepth/1000}+meter;BackFootDepth=${backFootDepth/1000}+meter`;
    
    // Hash and caching
    const hashData = JSON.stringify({ configurationStr, format, vid });
    const hash = await generateHash(hashData);
    const filename = `${hash}.${format}`;

    const cached = await modelCache.get(filename);
    if (cached) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          'Content-Type': format === 'stl' ? 'model/stl' : 'model/gltf+json',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    if (payload.checkCacheOnly) {
      return new Response(JSON.stringify({ error: 'Not found in cache' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cache Miss - Translate API
    let apiPath;
    let translationPayload;

    if (format === 'stl') {
      apiPath = `/api/partstudios/d/${did}/v/${vid}/e/${eid}/translations`;
      translationPayload = {
        formatName: 'STL',
        storeInDocument: false,
        configuration: configurationStr
      };
    } else {
      apiPath = `/api/partstudios/d/${did}/v/${vid}/e/${eid}/export/gltf`;
      translationPayload = {
        destinationName: 'model.gltf',
        storeInDocument: false,
        grouping: true,
        advancedParams: {
          configuration: configurationStr
        }
      };
    }

    const apiUrl = `https://cad.onshape.com${apiPath}`;
    
    const method = 'POST';
    const query = '';
    const nonce = generateNonce();
    const date = new Date().toUTCString();
    const contentType = 'application/json';

    const signature = await signRequest(secretKey, method, apiPath, query, nonce, date, contentType);
    const authHeader = `On ${accessKey}:HmacSHA256:${signature}`;

    const onshapeReq = new Request(apiUrl, {
      method: method,
      headers: {
        'Content-Type': contentType,
        'Date': date,
        'On-Nonce': nonce,
        'Authorization': authHeader,
        'Accept': 'application/vnd.onshape.v1+json'
      },
      body: JSON.stringify(translationPayload)
    });

    const onshapeRes = await fetch(onshapeReq);
    if (!onshapeRes.ok) {
      const errorText = await onshapeRes.text();
      console.error('Onshape API error:', errorText);
      return new Response(`Onshape translation request failed: ${onshapeRes.status}`, { status: onshapeRes.status });
    }

    const onshapeData = await onshapeRes.json();
    const translationId = onshapeData.id;

    // Polling Loop
    let downloadUrl = null;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      const pollPath = `/api/translations/${translationId}`;
      const pollUrl = `https://cad.onshape.com${pollPath}`;
      const pollNonce = generateNonce();
      const pollDate = new Date().toUTCString();
      const pollSig = await signRequest(secretKey, 'GET', pollPath, '', pollNonce, pollDate, '');
      const pollAuth = `On ${accessKey}:HmacSHA256:${pollSig}`;

      const pollRes = await fetch(pollUrl, {
        headers: {
          'Date': pollDate,
          'On-Nonce': pollNonce,
          'Authorization': pollAuth,
          'Accept': 'application/vnd.onshape.v1+json'
        }
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      if (pollData.requestState === 'DONE') {
        const extDataId = pollData.resultExternalDataIds && pollData.resultExternalDataIds[0];
        if (extDataId) {
          downloadUrl = `https://cad.onshape.com/api/documents/d/${did}/externaldata/${extDataId}`;
        } else {
          // Alternative fallback if not stored in external data but download href is provided
          downloadUrl = `https://cad.onshape.com/api/documents/d/${did}/translations/${translationId}/download`;
        }
        break;
      } else if (pollData.requestState === 'FAILED') {
        return new Response('Onshape translation failed during processing', { status: 500 });
      }
    }

    if (!downloadUrl) {
      return new Response('Translation timed out or no download URL found', { status: 504 });
    }

    // Download translated file
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
      }
    });

    if (!dlRes.ok) {
      return new Response('Failed to download translation from Onshape', { status: dlRes.status });
    }

    // Cache to R2
    const fileBuffer = await dlRes.arrayBuffer();
    await modelCache.put(filename, fileBuffer);

    // Return to frontend
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': format === 'stl' ? 'model/stl' : 'model/gltf+json',
        'Cache-Control': 'public, max-age=31536000'
      }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
