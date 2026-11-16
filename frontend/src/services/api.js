const BASE_URL = '/api';

export async function fetchPlayer() {
  try {
    const res = await fetch(`${BASE_URL}/player`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch player');
    return await res.json();
  } catch (err) {
    console.warn('API error (fetchPlayer):', err);
    return { id: 'offline-guest', created_at: new Date().toISOString(), runs_played: 0, best_score: 0 };
  }
}

export async function fetchMap(mapId = 'selu_campus') {
  const res = await fetch(`${BASE_URL}/maps/${mapId}`);
  if (!res.ok) throw new Error(`Failed to load map: ${mapId}`);
  return await res.json();
}

// Map editor: write the edited map back to backend/data/maps/<mapId>.json
export async function saveMap(mapId, map) {
  const res = await fetch(`${BASE_URL}/maps/${mapId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map)
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = JSON.stringify((await res.json()).detail); } catch { /* keep statusText */ }
    throw new Error(`Save failed (${res.status}): ${detail}`);
  }
  return await res.json();
}

export async function fetchPermitsConfig() {
  try {
    const res = await fetch(`${BASE_URL}/maps/config/permits`);
    if (!res.ok) throw new Error('Failed to load permits');
    return await res.json();
  } catch {
    return { permits: {} };
  }
}

export async function fetchDifficultyConfig() {
  try {
    const res = await fetch(`${BASE_URL}/maps/config/difficulty`);
    if (!res.ok) throw new Error('Failed to load difficulty');
    return await res.json();
  } catch {
    return { levels: {} };
  }
}

export async function startRun({ mapId, permitType, difficulty, destinationBuilding }) {
  try {
    const res = await fetch(`${BASE_URL}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        map_id: mapId,
        permit_type: permitType,
        difficulty,
        destination_building: destinationBuilding
      })
    });
    if (!res.ok) throw new Error('Failed to start run');
    return await res.json();
  } catch (err) {
    console.warn('Fallback local run ID:', err);
    return { id: Date.now(), player_id: 'offline', map_id: mapId, permit_type: permitType, difficulty };
  }
}

export async function finishRun(runId, { result, timeToPark, strikes, alignmentOffset }) {
  try {
    const res = await fetch(`${BASE_URL}/runs/${runId}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        result,
        time_to_park: timeToPark,
        strikes,
        alignment_offset: alignmentOffset
      })
    });
    if (!res.ok) throw new Error('Failed to finish run');
    return await res.json();
  } catch (err) {
    console.warn('Finish run offline calculation:', err);
    return { id: runId, result, score: result === 'parked' ? 1250 - (strikes * 200) : 0 };
  }
}

export async function sendTelemetryBatch(runId, samples) {
  if (!samples || samples.length === 0) return;
  try {
    await fetch(`${BASE_URL}/runs/${runId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ samples })
    });
  } catch (err) {
    // Non-blocking telemetry batch drop
  }
}

export async function logEvent(runId, t, eventType, details = null) {
  try {
    await fetch(`${BASE_URL}/runs/${runId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ t, event_type: eventType, details })
    });
  } catch {
    // Non-blocking
  }
}

export async function fetchRecentRuns(limit = 6) {
  try {
    const res = await fetch(`${BASE_URL}/runs?limit=${limit}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch runs');
    return await res.json();
  } catch (err) {
    console.warn('API error (fetchRecentRuns):', err);
    return [];
  }
}

export function getExportCsvUrl(runId) {
  return `${BASE_URL}/runs/${runId}/export.csv`;
}
