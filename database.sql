-- Drop if exists
DROP TABLE IF EXISTS song_artist;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS years;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS playlists;
DROP TABLE IF EXISTS playlist_songs;
DROP TABLE IF EXISTS song_favorites;


-- Create Years table
CREATE TABLE years (
    year_id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_value INTEGER NOT NULL UNIQUE
);

INSERT INTO years (year_value) VALUES
(2005),  -- year_id 1
(2006),  -- year_id 2
(2007),  -- year_id 3
(2008),  -- year_id 4
(2009),  -- year_id 5
(2010),  -- year_id 6
(2011),  -- year_id 7
(2012),  -- year_id 8
(2013),  -- year_id 9
(2014),  -- year_id 10
(2015),  -- year_id 11
(2016),  -- year_id 12
(2017),  -- year_id 13
(2018),  -- year_id 14
(2019),  -- year_id 15
(2020),  -- year_id 16
(2021),  -- year_id 17
(2022),  -- year_id 18
(2023),  -- year_id 19
(2024);  -- year_id 20


-- Create Artists table
CREATE TABLE artists (
    artist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_name TEXT NOT NULL UNIQUE
);

INSERT INTO artists (artist_name) VALUES
('Ed Sheeran'),
('Olly Murs'),
('Charlie Puth'),
('Alan Walker'),
('Luke Bryan'),
('Hollywood Ending'),
('Stephen Sanchez'),
('Jax'),
('Nicky Youre'),
('Meghan Trainor'),
('JVKE'),
('Lady Gaga'),
('Bruno Mars'),
('Missy Elliott'),
('Russell Dickerson'),
('John Michael Howell'),
('Justin Bieber'),
('BTS'),
('Midnight Youth'),
('After Romeo'),
('Gu Keunbbyul'),
('Jung Kook'),
('Roseanne Park');

-- Create Songs table
CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_name TEXT NOT NULL,
    year_id INTEGER,
    file_path TEXT NOT NULL,
    image_path TEXT,
    FOREIGN KEY (year_id) REFERENCES years(year_id)
);
INSERT INTO songs (song_name, year_id, file_path, image_path) VALUES
('Shape of You', 13, 'songs/shape_of_you.mp3', 'images/shape_of_you.jpg'),
('Perfect', 13, 'songs/Perfect.mp3', 'images/Perfect.jpg'), 
('Dance With Me Tonight', 7, 'songs/Dance_With_Me_Tonight.mp3', 'images/Dance_With_Me_Tonight.jpg'),
('Attention', 13, 'songs/Attention.mp3', 'images/Attention.jpg'),
('Dark Side', 14, 'songs/Darkside.mp3', 'images/Darkside.jpg'),
('Play It Again', 9, 'songs/Play_It_Again.mp3', 'images/Play_It_Again.png'),
('Not Another Song About Love', 10, 'songs/Not_Another_Song_About_Love.mp3', 'images/Not_Another_Song_About_Love.jpg'),
('Until I Found You', 17, 'songs/Until_I_Found_You.mp3', 'images/Until_I_Found_You.jpg'),
('Like My Father', 17, 'songs/Like_My_Father.mp3', 'images/Like_My_Father.jpg'),
('Sunroof', 17, 'songs/Sunroof.mp3', 'images/Sunroof.jpg'),
('Made You Look', 18, 'songs/Made_You_Look.mp3', 'images/Made_You_Look.jpg'),
('Golden Hour', 20, 'songs/golden_hour.mp3', 'images/golden_hour.jpg'),
('Die With My Smile', 20, 'songs/Die_With_A_Smile.mp3', 'images/Die_With_A_Smile.jpg'),
('Lose Control', 1, 'songs/Lose_Control.mp3', 'images/Lose_Control.jpg'),
('More Than Yesterday', 19, 'songs/song4.mp3', 'images/More_Than_Yesterday.jpg'),
('Had Me at Goodbye', 20, 'songs/Had_Me_at_Goodbye.mp3', 'images/Had_Me_at_Goodbye.jpg'),
('You and Me', NULL, 'songs/song4.mp3', 'images/You_and_Me.jpg'),
('Beauty And A Beat', 8, 'songs/Beauty_And_A_Beat.mp3', 'images/Beauty_And_A_Beat.jpg'),
('Apt', 10, 'songs/Apt.mp3', 'images/Apt.jpg'),
('Sing My Song', 13, 'songs/Sing_My_Song.mp3', 'images/Sing_My_Song.jpg'),
('How it Happens', 13, 'songs/How it Happens.mp3', 'images/How_it_Happens.jpg'),
('Butter', 17, 'songs/Butter.mp3', 'images/Butter.jpg'),
('Standing Next To You', 10, 'songs/Standing_Next_To_You.mp3', 'images/Standing_Next_To_You.jpg'),
('Golden Love', 12, 'songs/Golden Love.mp3', 'images/Golden_Love.jpg');


-- Create Song_Artist table (join table)
CREATE TABLE song_artist (
    song_id INTEGER,
    artist_id INTEGER,
    PRIMARY KEY (song_id, artist_id),
    FOREIGN KEY (song_id) REFERENCES songs(id),
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
);

INSERT INTO song_artist (song_id, artist_id) VALUES
(1, 1),
(2, 1),
(3, 2),
(4, 3),
(5, 4),
(6, 5),
(7, 6),
(8, 7),
(9, 8),
(10, 9),
(11, 10),
(12, 11),
(13, 12),
(13, 13),
(14, 14),
(15, 15),
(16, 16),
(17, 17),
(18, 17),
(19, 13),
(19, 23),
(20, 21),
(21, 20),
(22, 18),
(23, 22),
(24, 19);


-- USERS table (support both normal login and Google login)
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT, -- bcrypt hashed password (NULL if Google account)
  google_id TEXT, -- If created via Google login
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PLAYLISTS table
CREATE TABLE playlists (
  playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_name TEXT NOT NULL,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- PLAYLIST_SONGS table
CREATE TABLE playlist_songs (
  playlist_id INTEGER,
  song_id INTEGER,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id),
  FOREIGN KEY (song_id) REFERENCES songs(id)
);

-- SONG_FAVORITES table
CREATE TABLE song_favorites (
  favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  song_id INTEGER,
  date_favorited DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (song_id) REFERENCES songs(id)
);

