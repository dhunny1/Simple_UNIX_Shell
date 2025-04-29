// --- Basic Setup ---
const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// --- Database Setup ---
const DB_PATH = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('❌ Failed to connect to database:', err.message);
    else console.log('✅ Connected to the SQLite database.');
});

// --- Middlewares ---
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Passport Setup ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE user_id = ?', [id], (err, row) => {
        if (err) return done(err);
        done(null, row);
    });
});

// --- JWT Authentication Middleware ---
function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}



// Serve Main Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API Endpoints ---

// Get All Songs
app.get('/api/songs', (req, res) => {
    const { search } = req.query; // The search query can include the year, artist, or song name
    let query = `
        SELECT songs.*, GROUP_CONCAT(artists.artist_name, ', ') AS artist_names, years.year_value
        FROM songs
        LEFT JOIN song_artist ON songs.id = song_artist.song_id
        LEFT JOIN artists ON song_artist.artist_id = artists.artist_id
        LEFT JOIN years ON songs.year_id = years.year_id
    `;
    const params = [];

    if (search) {
        // Check if we should search by song name, artist name, or year
        query += ` WHERE songs.song_name LIKE ? OR artists.artist_name LIKE ? OR years.year_value LIKE ? `;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY songs.id `;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch songs.' });
        res.json(rows);
    });
});


// Favorite / Unfavorite a Song
app.post('/api/favorite_song', authenticateToken, (req, res) => {
    const { song_id, favorite } = req.body;
    const userId = req.user.userId;

    if (favorite) {
        db.run('INSERT OR IGNORE INTO song_favorites (user_id, song_id) VALUES (?, ?)', [userId, song_id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to favorite song.' });
            res.json({ message: 'Song favorited!' });
        });
    } else {
        db.run('DELETE FROM song_favorites WHERE user_id = ? AND song_id = ?', [userId, song_id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to unfavorite song.' });
            res.json({ message: 'Song unfavorited!' });
        });
    }
});

// Get Favorite Songs
app.get('/api/get_favorites', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    db.all(`
        SELECT songs.*, GROUP_CONCAT(artists.artist_name, ', ') AS artist_names, years.year_value
        FROM song_favorites
        JOIN songs ON song_favorites.song_id = songs.id
        LEFT JOIN song_artist ON songs.id = song_artist.song_id
        LEFT JOIN artists ON song_artist.artist_id = artists.artist_id
        LEFT JOIN years ON songs.year_id = years.year_id
        WHERE song_favorites.user_id = ?
        GROUP BY songs.id
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch favorites.' });
        res.json(rows);
    });
});

// Create Playlist
app.post('/api/create_playlist', authenticateToken, (req, res) => {
    const { name } = req.body;
    const userId = req.user.userId;

    db.run('INSERT INTO playlists (playlist_name, user_id) VALUES (?, ?)', [name, userId], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to create playlist.' });
        res.json({ message: 'Playlist created!', playlistId: this.lastID });
    });
});

// Get Playlists
app.get('/api/get_playlists', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    db.all('SELECT * FROM playlists WHERE user_id = ?', [userId], (err, playlists) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch playlists.' });
        res.json(playlists);
    });
});

// Add Song to Playlist
app.post('/api/add_song_to_playlist', authenticateToken, (req, res) => {
    const { playlist_id, song_id } = req.body;
    const userId = req.user.userId;

    db.get('SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?', [playlist_id, userId], (err, playlist) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!playlist) return res.status(403).json({ error: 'Unauthorized to modify playlist.' });

        db.run('INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)', [playlist_id, song_id], function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                    return res.status(400).json({ error: 'Song already in playlist.' });
                }
                return res.status(500).json({ error: 'Failed to add song.' });
            }
            res.json({ message: 'Song added!' });
        });
    });
});

// Get Songs in Playlist
app.get('/api/get_playlist_songs/:playlistId', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const userId = req.user.userId;

    db.get('SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?', [playlistId, userId], (err, playlist) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!playlist) return res.status(403).json({ error: 'Unauthorized to view playlist.' });

        db.all(`
            SELECT songs.*, GROUP_CONCAT(artists.artist_name, ', ') AS artist_names, years.year_value
            FROM playlist_songs
            JOIN songs ON playlist_songs.song_id = songs.id
            LEFT JOIN song_artist ON songs.id = song_artist.song_id
            LEFT JOIN artists ON song_artist.artist_id = artists.artist_id
            LEFT JOIN years ON songs.year_id = years.year_id
            WHERE playlist_songs.playlist_id = ?
            GROUP BY songs.id
        `, [playlistId], (err, songs) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch playlist songs.' });
            res.json(songs);
        });
    });
});

// Remove Song from Playlist
app.delete('/api/remove_song_from_playlist', authenticateToken, (req, res) => {
    const { playlist_id, song_id } = req.body;
    const userId = req.user.userId;

    db.get('SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?', [playlist_id, userId], (err, playlist) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!playlist) return res.status(403).json({ error: 'Unauthorized' });

        db.run('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', [playlist_id, song_id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to remove song from playlist.' });
            res.json({ message: 'Song removed from playlist!' });
        });
    });
});

// Delete Playlist
app.delete('/api/delete_playlist/:playlistId', authenticateToken, (req, res) => {
    const playlistId = req.params.playlistId;
    const userId = req.user.userId;

    db.get('SELECT * FROM playlists WHERE playlist_id = ? AND user_id = ?', [playlistId, userId], (err, playlist) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!playlist) return res.status(403).json({ error: 'Unauthorized' });

        db.run('DELETE FROM playlist_songs WHERE playlist_id = ?', [playlistId], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to delete playlist songs.' });

            db.run('DELETE FROM playlists WHERE playlist_id = ?', [playlistId], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to delete playlist.' });
                res.json({ message: 'Playlist deleted successfully!' });
            });
        });
    });
});

// --- LOGIN API ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.password) {
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Password check error.' });
                }

                if (!result) {
                    return res.status(401).json({ error: 'Invalid email or password.' });
                }

                const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                res.json({ token });
            });
        } else {
            return res.status(401).json({ error: 'Please login with Google.' });
        }
    });
});

// --- SIGNUP API ---
app.post('/api/signup', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if email already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (user) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        // Hash the password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error hashing password.' });
            }

            // Insert new user
            db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], function(err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to create user.' });
                }

                const token = jwt.sign({ userId: this.lastID }, process.env.JWT_SECRET, { expiresIn: '7d' });
                res.json({ message: 'Signup successful!', token });
            });
        });
    });
});


// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
