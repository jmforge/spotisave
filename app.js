let accessToken = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (code) {
    accessToken = await handleRedirect();
    if (accessToken) {
      setStatusMessage('✅ Autenticación realizada con éxito.');
      document.getElementById('export-button').disabled = false;
      window.history.replaceState({}, document.title, '/');

      const savedClientId = sessionStorage.getItem('client_id');
      if (savedClientId) {
        document.getElementById('client-id').value = savedClientId;
      }
    }
  }
});

// Eventos
document.getElementById('login-button').addEventListener('click', initiateAuth);
document.getElementById('export-button').addEventListener('click', exportPlaylists);

// Utils DOM
function setStatusMessage(html) {
  const msg = document.getElementById('status-message');
  msg.innerHTML = html;
  msg.style.display = 'block';
}

function appendStatusMessage(html) {
  const msg = document.getElementById('status-message');
  msg.innerHTML += html;
}

function resetProgressUI() {
  document.getElementById('status-message').textContent = '';
}

// CSV Generator
function generateCSV(rows) {
  let csv = '\uFEFFNombre de la lista;Canción;Artista;Álbum;Track ID\n';
  csv += rows.map(row =>
    row.map(field => `"${field.replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  return csv;
}

// Descargar CSV con fecha
function downloadCSV(content) {
  const today = new Date().toISOString().split('T')[0];
  const filename = `spotify_playlists_${today}.csv`;
  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + content);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Exportar
async function exportPlaylists() {
  if (!accessToken) return alert('Por favor, inicia sesión primero.');

  try {
    setStatusMessage('⏳ Procesando...');

    const allTracks = [];
    const playlists = await fetchAll('https://api.spotify.com/v1/me/playlists');

    const trackData = await Promise.all(playlists.map(async p => {
      const tracks = await fetchAll(p.tracks.href);
      return { playlist: p.name, tracks };
    }));

    const totalTracks = trackData.reduce((sum, pd) => sum + pd.tracks.length, 0);
    const totalPlaylists = trackData.length;

    let processed = 0;

    for (const { playlist, tracks } of trackData) {
      for (const item of tracks) {
        const track = item.track;
        if (!track) continue; // Validación extra por si es null

        const trackName = track.name ?? '';
        const artist = track.artists?.map(a => a.name).join(', ') ?? '';

        allTracks.push([
          playlist,
          trackName,
          artist,
          track.album?.name ?? '',
          track.id ?? ''
        ]);

        processed++;

        // Mejora 3: Mostrar progreso en tiempo real
        setStatusMessage(`⏳ Exportando canciones... (${processed} / ${totalTracks})`);
      }
    }

    // CSV y descarga
    const csv = generateCSV(allTracks);
    downloadCSV(csv);

    // Finalizar
    setStatusMessage(`✅ Se han exportado ${totalPlaylists} listas y ${totalTracks} canciones.`);

  } catch (err) {
    setStatusMessage(`❌ Error durante la exportación: ${err.message}`);
    console.error(err);
  }
}

// Paginador con manejo de errores HTTP
async function fetchAll(url) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const items = [];

  while (url) {
    const res = await fetch(url, { headers });

    // Mejora 1: Manejo de errores HTTP
    if (!res.ok) {
      throw new Error(`Error al acceder a la API (${res.status} ${res.statusText})`);
    }

    const data = await res.json();
    if (data.items) items.push(...data.items);
    url = data.next;
  }

  return items;
}
