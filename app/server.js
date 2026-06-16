const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');

const app = express();

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

    <title>Distributed System Dashboard</title>

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

            max-width:1200px;
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

    </style>

</head>

<body>

    <div class="container">

        <div class="title">

            <h1>Distributed System Dashboard</h1>

            <p>
                High Availability System with Docker, Nginx, Redis, MariaDB, and Node.js
            </p>

        </div>

        <div class="grid">

            <div class="card">

                <h2>Active Server</h2>

                <div class="value">
                    ${APP_NAME}
                </div>

                <div class="status online">
                    ONLINE
                </div>

            </div>

            <div class="card">

                <h2>Total Requests</h2>

                <div class="value">
                    ${total}
                </div>

            </div>

            <div class="card">

                <h2>Database Active</h2>

                <div class="value">
                    ${activeDB || 'NONE'}
                </div>

                <div class="status online">
                    CONNECTED
                </div>

            </div>

            <div class="card">

                <h2>Load Balancer</h2>

                <div class="value">
                    NGINX
                </div>

                <div class="status online">
                    ACTIVE
                </div>

            </div>

        </div>

        <div class="grid" style="margin-top:20px;">

            <div class="card">

                <h2>Infrastructure</h2>

                <ul class="info-list">

                    <li>2 App Servers</li>

                    <li>2 MariaDB Databases</li>

                    <li>Redis Distributed Counter</li>

                    <li>Nginx Load Balancer</li>

                    <li>Docker Containerization</li>

                    <li>Failover System</li>

                </ul>

            </div>

            <div class="card">

                <h2>Technologies</h2>

                <ul class="info-list">

                    <li>Node.js</li>

                    <li>Express.js</li>

                    <li>MariaDB</li>

                    <li>Redis</li>

                    <li>Nginx</li>

                    <li>Docker Compose</li>

                </ul>

            </div>

            <div class="card">

                <h2>High Availability Features</h2>

                <ul class="info-list">

                    <li>Automatic Server Failover</li>

                    <li>Automatic Database Failover</li>

                    <li>Distributed Request Counter</li>

                    <li>Realtime Load Balancing</li>

                    <li>Container Isolation</li>

                    <li>Scalable Architecture</li>

                </ul>

            </div>

        </div>

        <div class="footer">

            Distributed System Architecture using Docker and Nginx

        </div>

    </div>

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