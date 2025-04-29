// --- GLOBAL VARIABLES ---
let currentPlaylist = [];
let currentSongIndex = -1;
const defaultAlbumArt = "images/default-album.jpg";
let currentPlaylistName = '';


// --- FETCH AND DISPLAY SONGS ---
async function fetchAndDisplaySongs(searchTerm = '') {
    const container = document.getElementById('songList');
    container.innerHTML = '<p>Loading songs...</p>';
    try {
        const res = await fetch(`/api/songs${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
        const songs = await res.json();
        displaySongList(songs);
    } catch (error) {
        console.error("Failed to fetch songs:", error);
        container.innerHTML = '<p>Failed to load songs.</p>';
    }
}

// --- DISPLAY SONG LIST ---
function displaySongList(songs) {
    const container = document.getElementById('songList');
    if (!songs || songs.length === 0) {
        container.innerHTML = '<p>No songs found.</p>';
        return;
    }

    container.innerHTML = '';
    songs.forEach(song => {
        const safeSongData = JSON.stringify(song).replace(/'/g, "&apos;");

        const songElement = document.createElement('div');
        songElement.className = 'song';
        songElement.innerHTML = `
            <div class="song-info">
                <img 
                    src="${song.image_path || defaultAlbumArt}" 
                    alt="cover" 
                    width="40" 
                    height="40" 
                    onerror="this.onerror=null; this.src='${defaultAlbumArt}'" 
                >
                <div>
                    <p class="song-title">${song.song_name}</p>
                    <p class="song-details">${song.artist_names || 'Unknown Artist'} (${song.year_value || 'N/A'})</p>
                </div>
            </div>
            <div class="song-actions">
                <span class="heart" onclick="toggleFavorite(${song.id}, this)">🤍</span>
                <button class="play-button" data-song='${safeSongData}'>Play</button>
                <button class="add-playlist-button" onclick="openAddToPlaylist(${song.id})">➕</button>
            </div>
        `;
        container.appendChild(songElement);
    });

    attachPlayListeners();
}


// --- ATTACH PLAY BUTTON LISTENERS ---
function attachPlayListeners() {
    document.querySelectorAll('.play-button').forEach(button => {
        button.addEventListener('click', function() {
            const songData = JSON.parse(this.dataset.song.replace(/&apos;/g, "'"));
            playSong(songData);
        });
    });
}

// --- PLAY A SONG ---
function playSong(song, playlist = []) {
    const audio = document.getElementById('audioPlayer');
    document.getElementById('nowPlayingTitle').textContent = song.song_name;
    document.getElementById('nowPlayingArtist').textContent = song.artist_names || 'Unknown Artist';
    
    // Log the image path to the console for debugging
    console.log("Image Path:", song.image_path);

    // 🛠 Update Playlist Info
    if (playlist.length > 0) {
        document.getElementById('nowPlayingPlaylist').textContent = `Playlist: ${currentPlaylistName || 'Unknown Playlist'}`;
    } else {
        document.getElementById('nowPlayingPlaylist').textContent = '';
    }

    // Ensure image path includes extension
    let imagePath = song.image_path || defaultAlbumArt;

    // If imagePath doesn't include an extension, add ".jpg" as fallback
    if (!imagePath.includes('.')) {
        imagePath += '.jpg'; 
    }

    // Set the image source
    document.getElementById('nowPlayingImage').src = imagePath;

    audio.src = song.file_path;
    audio.play().catch(error => console.error('Audio play failed:', error));

    if (playlist.length > 0) {
        currentPlaylist = playlist;
        currentSongIndex = playlist.findIndex(s => s.id === song.id);
    }
}


// --- NEXT / PREVIOUS SONG ---
document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPlaylist.length > 0 && currentSongIndex > 0) {
        currentSongIndex--;
        playSong(currentPlaylist[currentSongIndex], currentPlaylist);
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    if (currentPlaylist.length > 0 && currentSongIndex < currentPlaylist.length - 1) {
        currentSongIndex++;
        playSong(currentPlaylist[currentSongIndex], currentPlaylist);
    }
});

document.getElementById('audioPlayer').addEventListener('ended', () => {
    if (currentPlaylist.length > 0 && currentSongIndex < currentPlaylist.length - 1) {
        currentSongIndex++;
        playSong(currentPlaylist[currentSongIndex], currentPlaylist);
    }
});

// --- TOGGLE FAVORITE HEART ---
async function toggleFavorite(songId, heartElement) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast("Please login to favorite songs!");
        return;
    }

    const isFavorited = heartElement.classList.contains('favorited');

    const response = await fetch('/api/favorite_song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ song_id: songId, favorite: !isFavorited })
    });

    if (!response.ok) {
        const data = await response.json();
        showToast(data.error || "Failed to favorite/unfavorite song.");
        return;
    }

    heartElement.classList.toggle('favorited');
    heartElement.textContent = heartElement.classList.contains('favorited') ? "❤️" : "🤍";

    if (!heartElement.classList.contains('favorited') && document.getElementById('myLibrarySection').style.display === 'block') {
        const songElement = heartElement.closest('.song');
        if (songElement) songElement.remove();
    }
}

// --- SEARCH BAR ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("TOKEN:", localStorage.getItem('token'));

    fetchAndDisplaySongs();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => fetchAndDisplaySongs(e.target.value.trim()));
    }
});

// --- HANDLE MY LIBRARY ---
document.getElementById('myLibraryLink').addEventListener('click', async () => {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('myLibrarySection').style.display = 'block';
    await loadFavorites();
    await loadPlaylists();
});

// --- LOAD FAVORITES ---
async function loadFavorites() {
    const container = document.getElementById('favoritesList');
    container.innerHTML = '<p>Loading favorites...</p>';
    const token = localStorage.getItem('token');
    if (!token) {
        container.innerHTML = '<p>Please log in to see your favorites.</p>';
        return;
    }

    try {
        const res = await fetch('/api/get_favorites', { headers: { Authorization: `Bearer ${token}` } });
        const favorites = await res.json();
        if (!favorites.length) {
            container.innerHTML = '<p>No favorites yet.</p>';
            return;
        }

        container.innerHTML = '';
        favorites.forEach(song => {
            const safeSongData = JSON.stringify(song).replace(/'/g, "&apos;");
            const songElement = document.createElement('div');
            songElement.className = 'song';
            songElement.innerHTML = `
                <div class="song-info">
                    <img src="${song.image_path || defaultAlbumArt}" alt="cover" width="40" height="40">
                    <div>
                        <p class="song-title">${song.song_name}</p>
                        <p class="song-details">${song.artist_names} (${song.year_value || 'N/A'})</p>
                    </div>
                </div>
                <div class="song-actions">
                    <span class="heart favorited" onclick="toggleFavorite(${song.id}, this)">❤️</span>
                    <button class="play-button" data-song='${safeSongData}'>Play</button>
                </div>
            `;
            container.appendChild(songElement);
        });
        attachPlayListeners();
    } catch (error) {
        console.error('Failed to load favorites:', error);
        container.innerHTML = '<p>Failed to load favorites.</p>';
    }
}

// --- CREATE PLAYLIST ---
async function createPlaylist(event) {
    event.preventDefault();
    const playlistName = document.getElementById('playlistName').value.trim();
    if (!playlistName) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/create_playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: playlistName })
    });

    const data = await res.json();

    if (res.ok) {
        showToast('Playlist created!');
        document.getElementById('playlistName').value = '';
        loadPlaylists();
    } else {
        showToast(data.error || 'Failed to create playlist.');
    }
}

// --- LOAD PLAYLISTS ---
async function loadPlaylists() {
    const playlistsContainer = document.getElementById('playlistsList');
    playlistsContainer.innerHTML = '<p>Loading playlists...</p>';

    const token = localStorage.getItem('token');
    const res = await fetch('/api/get_playlists', { headers: { Authorization: `Bearer ${token}` } });
    const playlists = await res.json();

    if (!playlists.length) {
        playlistsContainer.innerHTML = '<p>No playlists yet.</p>';
        return;
    }

    playlistsContainer.innerHTML = '';
    playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.className = 'playlist-card';
        playlistCard.innerHTML = `
            <div class="playlist-header">
                <h3>${playlist.playlist_name}</h3>
                <button onclick="deletePlaylist(${playlist.playlist_id})">🗑️</button>
            </div>
            <p>Created: ${new Date(playlist.created_at).toLocaleDateString()}</p>
        `;
    
        // when you click on playlist card, load its songs
        playlistCard.addEventListener('click', () => {
            loadSongsFromPlaylist(playlist.playlist_id, playlist.playlist_name);
        });
    
        playlistsContainer.appendChild(playlistCard);
    });
    
}

function openAddToPlaylist(songId) {
    const modal = document.getElementById('addToPlaylistModal');
    const select = document.getElementById('playlistSelect');
    const confirmBtn = document.getElementById('addToPlaylistConfirm');
    const cancelBtn = document.getElementById('addToPlaylistCancel');
  
    // Clear previous options
    select.innerHTML = '';
  
    // Fetch playlists
    const token = localStorage.getItem('token');
    fetch('/api/get_playlists', {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(playlists => {
        console.log('Fetched playlists:', playlists); 
    
        if (!Array.isArray(playlists) || playlists.length === 0) {
            select.innerHTML = '<option disabled>No playlists found</option>';
            return;
        }
        playlists.forEach(pl => {
            const option = document.createElement('option');
            option.value = pl.playlist_id; 
            option.textContent = pl.playlist_name; 
            select.appendChild(option);
        });
    })
    
    .catch(err => {
        console.error('Error fetching playlists:', err);
        showToast('Failed to load playlists.');
    });

  
    // Show modal
    modal.classList.remove('hidden');
  
    const onConfirm = async () => {
      const playlistId = select.value;
      if (!playlistId) {
        showToast('Please select a playlist.');
        return;
      }
  
      try {
        const res = await fetch(`/api/add_song_to_playlist`,  {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({  playlist_id: playlistId, song_id: songId })
        });
  
        if (res.ok) {
          showToast('Song added to playlist.');
          loadPlaylists(); // Refresh playlists if needed
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to add song.');
        }
      } catch (error) {
        console.error('Error adding song to playlist:', error);
        showToast('An error occurred while adding the song.');
      }
  
      cleanup();
    };
  
    const cleanup = () => {
      modal.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', cleanup);
    };
  
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', cleanup);
  }

  // --- LOAD SONGS FROM PLAYLIST ---
  async function loadSongsFromPlaylist(playlistId, playlistName) {
    const container = document.getElementById('favoritesList');
    const title = document.getElementById('currentPlaylistTitle');

    title.textContent = `Now Playing Playlist: ${playlistName}`; 
    currentPlaylistName = playlistName; 
    container.innerHTML = `<p>Loading songs for "${playlistName}"...</p>`;

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/get_playlist_songs/${playlistId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const songs = await res.json();

        if (!songs.length) {
            container.innerHTML = `<p>No songs in "${playlistName}" yet.</p>`;
            return;
        }

        container.innerHTML = '';
        songs.forEach(song => {
            const safeSongData = JSON.stringify(song).replace(/'/g, "&apos;");
            const songElement = document.createElement('div');
            songElement.className = 'song';
            songElement.innerHTML = `
                <div class="song-info">
                    <img src="${song.image_path || defaultAlbumArt}" alt="cover" width="40" height="40">
                    <div>
                        <p class="song-title">${song.song_name}</p>
                        <p class="song-details">${song.artist_names || 'Unknown Artist'} (${song.year_value || 'N/A'})</p>
                    </div>
                </div>
                <div class="song-actions">
                    <button class="play-button" data-song='${safeSongData}'>Play</button>
                    <button class="remove-button" onclick="removeSongFromPlaylist(${playlistId}, ${song.id})">🗑️</button> <!-- 🛠 Add remove button here -->
                </div>
            `;
            container.appendChild(songElement);
        });

        currentPlaylist = songs;
        currentSongIndex = -1;

        attachPlayListeners();
    } catch (error) {
        console.error('Failed to load playlist songs:', error);
        container.innerHTML = `<p>Failed to load songs for "${playlistName}".</p>`;
    }
}

// --- REMOVE SONG FROM PLAYLIST ---
async function removeSongFromPlaylist(playlistId, songId) {
    const modal = document.getElementById('confirmationModal');
    const message = document.getElementById('confirmationMessage');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');

    // Set the message for confirming the removal
    message.textContent = 'Are you sure you want to remove this song from the playlist?';
    modal.classList.remove('hidden');

    const onConfirm = async () => {
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/remove_song_from_playlist', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ playlist_id: playlistId, song_id: songId })
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Song removed from playlist!');
                loadSongsFromPlaylist(playlistId, document.getElementById('currentPlaylistTitle').textContent.replace('Now Playing Playlist: ', '')); // Reload playlist songs
            } else {
                showToast(data.error || 'Failed to remove song.');
            }
        } catch (error) {
            console.error('Error removing song:', error);
            showToast('An error occurred while removing the song.');
        }

        cleanup();
    };

    const cleanup = () => {
        modal.classList.add('hidden');
        confirmYes.removeEventListener('click', onConfirm);
        confirmNo.removeEventListener('click', cleanup);
    };

    confirmYes.addEventListener('click', onConfirm);
    confirmNo.addEventListener('click', cleanup);
}



// --- DELETE PLAYLIST ---
function deletePlaylist(playlistId) {
    const modal = document.getElementById('confirmationModal');
    const message = document.getElementById('confirmationMessage');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');

    message.textContent = 'Are you sure you want to delete this playlist?';
    modal.classList.remove('hidden');

    const onConfirm = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/delete_playlist/${playlistId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Playlist deleted.');
                loadPlaylists();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to delete playlist.');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            showToast('An error occurred while deleting the playlist.');
        }
        cleanup();
    };

    const cleanup = () => {
        modal.classList.add('hidden');
        confirmYes.removeEventListener('click', onConfirm);
        confirmNo.removeEventListener('click', cleanup);
    };

    confirmYes.addEventListener('click', onConfirm);
    confirmNo.addEventListener('click', cleanup);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
