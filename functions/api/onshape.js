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

export async function onRequestPost(context) {
  const { request, env } = context;

  const accessKey = env.ONSHAPE_ACCESS_KEY;
  const secretKey = env.ONSHAPE_SECRET_KEY;
  const documentId = env.ONSHAPE_DOCUMENT_ID;
  const workspaceId = env.ONSHAPE_WORKSPACE_ID;
  const elementId = env.ONSHAPE_ELEMENT_ID;

  if (!accessKey || !secretKey || !documentId || !workspaceId || !elementId) {
    return new Response('Missing Onshape configuration in environment variables.', { status: 500 });
  }

  try {
    const payload = await request.json();
    
    // Onshape configuration update endpoint
    const apiPath = `/api/elements/d/${documentId}/w/${workspaceId}/e/${elementId}/configuration`;
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
      body: JSON.stringify(payload)
    });

    const onshapeRes = await fetch(onshapeReq);
    const onshapeData = await onshapeRes.text();

    if (!onshapeRes.ok) {
      console.error('Onshape API error:', onshapeData);
      return new Response(`Onshape API error: ${onshapeRes.status} ${onshapeRes.statusText}`, {
        status: onshapeRes.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return new Response(onshapeData, {
      status: 200,
      headers: {
        'Content-Type': onshapeRes.headers.get('Content-Type') || 'application/json'
      }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
