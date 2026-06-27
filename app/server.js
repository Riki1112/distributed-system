const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');

const app = express();

app.use(express.static('public'));

const PORT = 3000;

const APP_NAME = process.env.APP_NAME;

const redisClient = redis.createClient({
    url: 'redis://redis:6379'
});

redisClient.connect();

async function connectDB(host) {

    try {

        return await mysql.createConnection({
            host,
            user: 'root',
            password: 'root',
            database: 'distributed_db',
            connectTimeout: 500
        });

    } catch {

        return null;
    }
}

async function initialize(db) {

    await db.execute(`
        CREATE TABLE IF NOT EXISTS requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            total_request INT,
            server_name VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

app.get('/', async (req, res) => {

    try {

        const total = await redisClient.incr('global_counter');

        let activeDB = null;

for (const host of ['db1', 'db2']) {

    const db = await connectDB(host);

    if (!db) continue;

    try {

        await initialize(db);

        await db.execute(`
            INSERT INTO requests
            (total_request, server_name)
            VALUES (?, ?)
        `, [total, APP_NAME]);

        activeDB = host;

        await db.end();

    } catch {}
}

res.send(`
<!DOCTYPE html>
<html>

<head>

    <title>Video Player</title>

    <style>

        *{
            margin:0;
            padding:0;
            box-sizing:border-box;
            font-family:Arial;
        }

        body{

            background:#0f172a;
            color:white;
            padding:40px;
        }

        .container{
            width:95%;
            max-width:1600px;
            margin:auto;
        }

        .title{

            text-align:center;
            margin-bottom:40px;
        }

        .title h1{

            font-size:42px;
            margin-bottom:10px;
        }

        .title p{

            color:#94a3b8;
            font-size:18px;
        }

        .grid{

            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
            gap:20px;
        }

        .card{

            background:#1e293b;
            padding:25px;
            border-radius:15px;
            box-shadow:0 0 15px rgba(0,0,0,0.3);
        }

        .card h2{

            margin-bottom:15px;
            font-size:22px;
        }

        .value{

            font-size:36px;
            font-weight:bold;
            color:#38bdf8;
        }

        .status{

            display:inline-block;
            padding:8px 14px;
            border-radius:20px;
            margin-top:10px;
            font-weight:bold;
        }

        .online{

            background:#16a34a;
        }

        .info-list{

            margin-top:10px;
        }

        .info-list li{

            margin-bottom:10px;
            color:#cbd5e1;
        }

        .footer{

            margin-top:40px;
            text-align:center;
            color:#64748b;
        }

        .video-player{

         margin-bottom:30px;

        }

.video-player video{

    width:100%;
    aspect-ratio:16 / 9;
    max-height:500px;
    border-radius:15px;
    background:black;

}

}

    }

    .video-info{

        margin-top:20px;

    }

    .video-info h2{

        font-size:30px;
        margin-bottom:10px;

    }

    .badge{

        display:inline-block;
        padding:8px 16px;
        border-radius:30px;
        background:#2563eb;
        margin-top:10px;

    }

    .playlist{

        display:flex;
        gap:15px;
        margin-top:20px;
        flex-wrap:wrap;

    }

    .playlist button{

        background:#2563eb;
        color:white;
        border:none;
        padding:12px 20px;
        border-radius:10px;
        cursor:pointer;
        font-size:16px;
        transition:0.3s;

    }

    .playlist button:hover{

        background:#1d4ed8;

    }

    .play-card{

        background:#1e293b;
        border-radius:15px;
        overflow:hidden;

    }

    .play-card img{

        width:100%;
        height:140px;
        object-fit:cover;

    }

    .play-card h3{

        padding:15px;
        font-size:18px;

    }

    </style>

</head>

<body>

    <div class="container">

        <div class="title">

            <h1>Video Player</h1>

            <p>
                Watch your favorite videos anywhere.
            </p>

        </div>

        <div class="grid">

        <div class="card video-player">

<h2>🎬 Now Playing</h2>

<video id="player" controls preload="metadata">
    <source
        id="videoSource"
        src="/videos/teaser.mp4"
        type="video/mp4">

</video>

<script>

const video = document.querySelector("video");

// Ambil posisi terakhir
const lastTime = localStorage.getItem("videoTime");

if(lastTime){
    video.currentTime = parseFloat(lastTime);
}

// Simpan posisi setiap kali video berjalan
video.addEventListener("timeupdate", () => {
    localStorage.setItem("videoTime", video.currentTime);
});

</script>

    <div class="video-info">

        <h2 id="judulVideo">
            Toy Story 5 | Teaser Trailer | In Theaters June 19
        </h2>
        
        <p>
            Video Player menggunakan sistem Distributed System.
        </p>

        <div class="badge">
            👁 ${total} Views
        </div>

        <p style="margin-top:20px;">
            <b>Server :</b> ${APP_NAME}
        </p>

        <p>
            <b>Storage :</b> ${activeDB}
        </p>

        <hr style="margin:30px 0;border:1px solid #334155;">

        <h2>🎬 Playlist</h2>

        <div class="playlist">

            <button
                onclick="changeVideo('teaser.mp4','Toy Story 5 | Teaser Trailer | In Theaters June 19')">
                🎥 Toy Story 5
            </button>

            <button
                onclick="changeVideo('spiderman.mp4','Spider-Man Trailer')">
                🕷 Spider-Man
            </button>

        </div>

    </div>



        <div class="footer">

            Distributed System Architecture using Docker and Nginx

        </div>

    </div>

<script>

function changeVideo(file, title){

    const player = document.getElementById("player");

    const source = document.getElementById("videoSource");

    source.src = "/videos/" + file;

    player.load();

    player.play();

    document.getElementById("judulVideo").innerText = title;

}

</script>

</body>

</html>
`);

    } catch (err) {

        console.log(err);

        res.status(500).send('Application Error');
    }
});

app.listen(PORT, '0.0.0.0', () => {

    console.log(`${APP_NAME} running on port ${PORT}`);
});