const { Room, RoomEvent, Track } = LivekitClient;

const DEFAULT_ROOMS = ['geral', 'jogos', 'filme'];

// Qualidade do compartilhamento de tela. Suba/desca conforme sua internet
// e o quanto quer economizar dos 50GB/mes gratis do LiveKit.
const SCREEN_SHARE_RESOLUTION = { width: 1920, height: 1080, frameRate: 30 };
const SCREEN_SHARE_MAX_BITRATE = 6_000_000; // 6 Mbps

const els = {
  joinScreen: document.getElementById('join-screen'),
  nameInput: document.getElementById('name-input'),
  joinBtn: document.getElementById('join-btn'),
  joinError: document.getElementById('join-error'),

  appShell: document.getElementById('app-shell'),
  roomsList: document.getElementById('rooms-list'),
  addRoomBtn: document.getElementById('add-room-btn'),
  activeRoomName: document.getElementById('active-room-name'),
  sharerInfo: document.getElementById('sharer-info'),
  shareBtn: document.getElementById('share-btn'),
  stopBtn: document.getElementById('stop-btn'),
  videoArea: document.getElementById('video-area'),
  participantList: document.getElementById('participant-list'),
  memberCount: document.getElementById('member-count'),
  meName: document.getElementById('me-name'),
  leaveBtn: document.getElementById('leave-btn'),
};

let identity = null;
let displayName = null;
let knownRooms = [...DEFAULT_ROOMS];
let activeRoomName = null;
let room = null;
let localScreenTracks = [];
let currentSharerIdentity = null;

function friendlyName(id) {
  return id ? id.replace(/-[a-z0-9]{4}$/, '') : id;
}

function initials(name) {
  return friendlyName(name).slice(0, 2).toUpperCase();
}

function showPlaceholder(text) {
  els.videoArea.innerHTML = `<span class="placeholder">${text}</span>`;
}

function clearPlaceholder() {
  const placeholder = els.videoArea.querySelector('.placeholder');
  if (placeholder) placeholder.remove();
}

function refreshShareAvailability() {
  const someoneSharing = !!currentSharerIdentity;
  const iAmSharing = currentSharerIdentity === identity;

  els.shareBtn.classList.toggle('hidden', iAmSharing);
  els.stopBtn.classList.toggle('hidden', !iAmSharing);
  els.shareBtn.disabled = someoneSharing && !iAmSharing;
  els.sharerInfo.textContent = someoneSharing
    ? (iAmSharing ? 'voce esta compartilhando' : `${friendlyName(currentSharerIdentity)} esta compartilhando`)
    : '';
}

function renderRoomsList() {
  els.roomsList.innerHTML = '';
  for (const name of knownRooms) {
    const btn = document.createElement('button');
    btn.className = 'room-icon' + (name === activeRoomName ? ' active' : '');
    btn.title = name;
    btn.innerHTML = `${initials(name)}<span class="live-dot"></span>`;
    btn.addEventListener('click', () => {
      if (name !== activeRoomName) connectToRoom(name);
    });
    els.roomsList.appendChild(btn);
  }
}

function renderParticipants() {
  if (!room) return;
  els.participantList.innerHTML = '';

  const all = [
    { id: identity, isMe: true },
    ...Array.from(room.remoteParticipants.values()).map((p) => ({ id: p.identity, isMe: false })),
  ];

  els.memberCount.textContent = all.length;

  for (const { id, isMe } of all) {
    const li = document.createElement('li');
    li.className = 'member-row' + (isMe ? ' me' : '');

    const avatar = document.createElement('div');
    avatar.className = 'member-avatar';
    avatar.textContent = initials(id);

    const dot = document.createElement('span');
    dot.className = 'status-dot online';

    const name = document.createElement('span');
    name.className = 'member-name';
    name.textContent = friendlyName(id) + (isMe ? ' (voce)' : '');

    li.appendChild(avatar);
    li.appendChild(dot);
    li.appendChild(name);

    if (id === currentSharerIdentity) {
      const badge = document.createElement('span');
      badge.className = 'share-badge';
      badge.title = 'Compartilhando a tela';
      badge.textContent = '🖥';
      li.appendChild(badge);
    }

    els.participantList.appendChild(li);
  }
}

function attachTrack(track, participantIdentity) {
  clearPlaceholder();
  const el = track.attach();
  el.dataset.participant = participantIdentity;
  el.dataset.trackSid = track.sid;
  if (el.tagName === 'AUDIO') {
    el.style.display = 'none';
  }
  els.videoArea.appendChild(el);
}

function detachTrack(track) {
  track.detach().forEach((el) => el.remove());
  if (!els.videoArea.querySelector('video, audio')) {
    showPlaceholder('Ninguem esta compartilhando a tela');
  }
}

async function connectToRoom(roomName) {
  if (room) {
    if (localScreenTracks.length) await stopShare();
    const oldRoom = room;
    room = null;
    await oldRoom.disconnect();
  }

  els.videoArea.innerHTML = '';
  showPlaceholder('Conectando...');
  currentSharerIdentity = null;

  const configRes = await fetch('/api/config');
  const { livekitUrl } = await configRes.json();

  const tokenRes = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: roomName, identity }),
  });
  if (!tokenRes.ok) throw new Error('Nao foi possivel obter o token de acesso');
  const { token } = await tokenRes.json();

  const newRoom = new Room();

  newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    attachTrack(track, participant.identity);
    if (track.source === Track.Source.ScreenShare) {
      currentSharerIdentity = participant.identity;
      refreshShareAvailability();
      renderParticipants();
    }
  });

  newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    detachTrack(track);
    if (track.source === Track.Source.ScreenShare && currentSharerIdentity === participant.identity) {
      currentSharerIdentity = null;
      refreshShareAvailability();
      renderParticipants();
    }
  });

  newRoom.on(RoomEvent.ParticipantConnected, renderParticipants);
  newRoom.on(RoomEvent.ParticipantDisconnected, renderParticipants);
  newRoom.on(RoomEvent.Disconnected, () => {
    if (room === newRoom) resetToJoinScreen();
  });

  await newRoom.connect(livekitUrl, token);
  room = newRoom;

  for (const participant of room.remoteParticipants.values()) {
    for (const publication of participant.videoTrackPublications.values()) {
      if (publication.source === Track.Source.ScreenShare) {
        currentSharerIdentity = participant.identity;
      }
    }
  }

  activeRoomName = roomName;
  if (!knownRooms.includes(roomName)) knownRooms.push(roomName);

  els.activeRoomName.textContent = roomName;
  els.meName.textContent = friendlyName(identity);
  showPlaceholder('Ninguem esta compartilhando a tela');
  renderRoomsList();
  renderParticipants();
  refreshShareAvailability();
}

async function startShare() {
  if (currentSharerIdentity) return;

  try {
    localScreenTracks = await LivekitClient.createLocalScreenTracks({
      audio: true,
      resolution: SCREEN_SHARE_RESOLUTION,
    });
  } catch (err) {
    console.error('Falha ao capturar a tela', err);
    return;
  }

  for (const track of localScreenTracks) {
    const publishOptions = { source: track.source };
    if (track.kind === 'video') {
      publishOptions.videoEncoding = {
        maxBitrate: SCREEN_SHARE_MAX_BITRATE,
        maxFramerate: SCREEN_SHARE_RESOLUTION.frameRate,
      };
      publishOptions.simulcast = false;
    }
    await room.localParticipant.publishTrack(track, publishOptions);
    attachTrack(track, identity);
  }

  currentSharerIdentity = identity;
  refreshShareAvailability();
  renderParticipants();

  const videoTrack = localScreenTracks.find((t) => t.kind === 'video');
  if (videoTrack?.mediaStreamTrack) {
    videoTrack.mediaStreamTrack.addEventListener('ended', stopShare);
  }
}

async function stopShare() {
  for (const track of localScreenTracks) {
    detachTrack(track);
    await room.localParticipant.unpublishTrack(track);
    track.stop();
  }
  localScreenTracks = [];
  currentSharerIdentity = null;
  refreshShareAvailability();
  renderParticipants();
  if (!els.videoArea.querySelector('video, audio')) {
    showPlaceholder('Ninguem esta compartilhando a tela');
  }
}

function resetToJoinScreen() {
  room = null;
  localScreenTracks = [];
  currentSharerIdentity = null;
  activeRoomName = null;
  els.appShell.classList.add('hidden');
  els.joinScreen.classList.remove('hidden');
  els.videoArea.innerHTML = '';
}

els.joinBtn.addEventListener('click', async () => {
  const name = els.nameInput.value.trim();
  els.joinError.textContent = '';

  if (!name) {
    els.joinError.textContent = 'Digite seu nome';
    return;
  }

  els.joinBtn.disabled = true;
  try {
    displayName = name;
    identity = `${name}-${Math.random().toString(36).slice(2, 6)}`;
    await connectToRoom(DEFAULT_ROOMS[0]);
    els.joinScreen.classList.add('hidden');
    els.appShell.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    els.joinError.textContent = 'Erro ao conectar. Confira o servidor e tente de novo.';
  } finally {
    els.joinBtn.disabled = false;
  }
});

els.addRoomBtn.addEventListener('click', () => {
  const name = window.prompt('Nome da nova sala:');
  const trimmed = name?.trim();
  if (trimmed) connectToRoom(trimmed);
});

els.shareBtn.addEventListener('click', startShare);
els.stopBtn.addEventListener('click', stopShare);
els.leaveBtn.addEventListener('click', async () => {
  if (localScreenTracks.length) await stopShare();
  const oldRoom = room;
  room = null;
  if (oldRoom) await oldRoom.disconnect();
  resetToJoinScreen();
});
