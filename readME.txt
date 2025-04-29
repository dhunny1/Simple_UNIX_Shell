npm install express sqlite3 cors
npm install express bcrypt jsonwebtoken nodemailer passport passport-google-oauth20 sqlite3 cors dotenv
npm install express-session
npm install bcryptjs
npm install bcryptjs jsonwebtoken


Steps to Run:
Create music.db:
```bash
    sqlite3 database.db < database.sql
```
Place your .mp3 files into /songs/ and album art into /images/.

Start server:
```bash
node server.js
```
Visit http://localhost:3000