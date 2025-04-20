//const clientId = '5edd62d39b3c43c381bbac78e01b0bda';
//const redirectUri = 'https://TU_USUARIO.github.io/TU_REPOSITORIO/';
const redirectUri = 'http://127.0.0.1:5500/';
const scopes = [
  'playlist-read-private',
  'playlist-read-collaborative'
];

async function initiateAuth() {
  const inputClientId = document.getElementById('client-id').value.trim();
  if (!inputClientId) {
    setStatusMessage('❌ Por favor, introduzca su Client ID.');
    return;
  }

  sessionStorage.setItem('client_id', inputClientId);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  sessionStorage.setItem('code_verifier', codeVerifier);

  const args = new URLSearchParams({
    response_type: 'code',
    client_id: inputClientId,
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  window.location = `https://accounts.spotify.com/authorize?${args.toString()}`;
}

async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;

  const codeVerifier = sessionStorage.getItem('code_verifier');
  const clientId = sessionStorage.getItem('client_id');

  if (!codeVerifier || !clientId) {
    setStatusMessage('❌ Faltan datos de autenticación. Por favor, vuelve a iniciar sesión.');
    return null;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    // ✅ Validación de respuesta
    if (!response.ok) {
      const error = await response.json();
      const message = error.error_description || response.statusText || 'Error desconocido';
      setStatusMessage(`❌ Error al obtener el token: ${message}`);
      return null;
    }

    const data = await response.json();

    // ✅ Limpieza de datos sensibles después de usarlos
    sessionStorage.removeItem('code_verifier');

    return data.access_token;

  } catch (err) {
    setStatusMessage(`❌ Error de red al solicitar el token: ${err.message}`);
    console.error(err);
    return null;
  }
}
