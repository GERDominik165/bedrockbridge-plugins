// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 🌐 INVENTORY SYNC - NODE.JS API SERVER
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Dieser Server wird auf localhost:3001 ausgeführt
// Er verbindet sich zu deiner MySQL-Datenbank
// Das Minecraft Plugin kommuniziert mit diesem Server über HTTP (@minecraft/server-net)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

// Lade .env Datei
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════════════════════

app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MYSQL CONNECTION POOL
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db.pavl21.de',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 's2654_bedrock',
  password: REDACTED || '',
  database: process.env.DB_NAME || 's2654_bedrock_sync',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

console.log(`\n[MySQL] Connecting to ${process.env.DB_HOST}...`);

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    // Erstelle Tabellen
    const tables = [
      `CREATE TABLE IF NOT EXISTS player_inventories (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(100) NOT NULL,
        player_name VARCHAR(50),
        inventory_json LONGTEXT NOT NULL,
        armor_json LONGTEXT,
        offhand_json LONGTEXT,
        stats_json LONGTEXT,
        effects_json LONGTEXT,
        capture_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        dimension VARCHAR(50),
        sync_reason VARCHAR(50),
        INDEX idx_uuid (uuid),
        INDEX idx_player (player_name),
        INDEX idx_time (capture_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS player_metadata (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(100) NOT NULL UNIQUE,
        player_name VARCHAR(50),
        last_save DATETIME,
        total_saves INT DEFAULT 0,
        last_dimension VARCHAR(50),
        join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME,
        INDEX idx_uuid (uuid),
        INDEX idx_player (player_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS system_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        log_id VARCHAR(100) UNIQUE,
        level VARCHAR(20),
        message TEXT,
        context_json LONGTEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_time (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS transaction_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE,
        player_name VARCHAR(50),
        operation VARCHAR(50),
        status VARCHAR(20),
        details_json LONGTEXT,
        duration_ms INT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_player (player_name),
        INDEX idx_operation (operation),
        INDEX idx_time (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS error_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        error_id VARCHAR(100) UNIQUE,
        error_message TEXT,
        error_stack LONGTEXT,
        context_json LONGTEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_time (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS health_checks (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        status_id VARCHAR(100) UNIQUE,
        active_players INT,
        total_syncs BIGINT,
        successful_syncs BIGINT,
        failed_syncs BIGINT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_time (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];

    for (const sql of tables) {
      try {
        await connection.execute(sql);
      } catch (e) {
        if (e.code !== 'ER_TABLE_EXISTS_ERROR') {
          console.log(`[Database] ⚠️ ${e.message}`);
        }
      }
    }

    connection.release();
    console.log(`[Database] ✅ Schema initialized`);
    return true;
  } catch (e) {
    console.log(`[Database] ❌ Error: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1');
    connection.release();

    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({
      status: 'error',
      message: e.message
    });
  }
});

// Save Inventory
app.post('/api/inventory/save', async (req, res) => {
  const startTime = Date.now();

  try {
    const { uuid, playerName, inventory, reason } = req.body;

    if (!uuid || !playerName || !inventory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();

    // Insert inventory
    const [saveResult] = await connection.execute(
      `INSERT INTO player_inventories
       (uuid, player_name, inventory_json, armor_json, offhand_json, stats_json, effects_json, dimension, sync_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        playerName,
        JSON.stringify(inventory.items || []),
        JSON.stringify(inventory.armor || {}),
        JSON.stringify(inventory.offhand || null),
        JSON.stringify(inventory.stats || {}),
        JSON.stringify(inventory.effects || []),
        inventory.dimension || 'minecraft:overworld',
        reason
      ]
    );

    // Update metadata
    await connection.execute(
      `INSERT INTO player_metadata (uuid, player_name, last_save, total_saves, last_dimension, last_activity)
       VALUES (?, ?, NOW(), 1, ?, NOW())
       ON DUPLICATE KEY UPDATE
       last_save = NOW(),
       total_saves = total_saves + 1,
       last_dimension = VALUES(last_dimension),
       last_activity = NOW()`,
      [uuid, playerName, inventory.dimension || 'minecraft:overworld']
    );

    // Log transaction
    const duration = Date.now() - startTime;
    await connection.execute(
      `INSERT INTO transaction_logs (transaction_id, player_name, operation, status, duration_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [`txn_${Date.now()}`, playerName, 'SAVE', 'SUCCESS', duration]
    );

    connection.release();

    console.log(`[API] ✅ Saved inventory for ${playerName} (${duration}ms)`);

    res.json({
      success: true,
      message: 'Inventory saved',
      insertId: saveResult.insertId,
      duration
    });
  } catch (e) {
    console.log(`[API] ❌ Error saving inventory: ${e.message}`);

    // Log error
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        `INSERT INTO error_logs (error_id, error_message, error_stack)
         VALUES (?, ?, ?)`,
        [`err_${Date.now()}`, e.message, e.stack]
      );
      connection.release();
    } catch (logError) {
      // Silent
    }

    res.status(500).json({
      error: e.message
    });
  }
});

// Load Inventory
app.get('/api/inventory/load', async (req, res) => {
  const startTime = Date.now();

  try {
    const { uuid } = req.query;

    if (!uuid) {
      return res.status(400).json({ error: 'Missing uuid parameter' });
    }

    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `SELECT inventory_json, armor_json, offhand_json, stats_json, effects_json, capture_time
       FROM player_inventories
       WHERE uuid = ?
       ORDER BY capture_time DESC
       LIMIT 1`,
      [uuid]
    );

    connection.release();

    if (rows.length === 0) {
      console.log(`[API] ⚠️ No data found for ${uuid}`);
      return res.json({ success: false, data: null });
    }

    const row = rows[0];
    const duration = Date.now() - startTime;

    const inventoryData = {
      items: JSON.parse(row.inventory_json || '[]'),
      armor: JSON.parse(row.armor_json || '{}'),
      offhand: JSON.parse(row.offhand_json || 'null'),
      stats: JSON.parse(row.stats_json || '{}'),
      effects: JSON.parse(row.effects_json || '[]'),
      captureTime: row.capture_time
    };

    console.log(`[API] ✅ Loaded inventory for ${uuid} (${duration}ms)`);

    res.json({
      success: true,
      data: inventoryData,
      duration
    });
  } catch (e) {
    console.log(`[API] ❌ Error loading inventory: ${e.message}`);

    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// Logs
app.post('/api/logs', async (req, res) => {
  try {
    const { level, message, context } = req.body;

    const connection = await pool.getConnection();

    await connection.execute(
      `INSERT INTO system_logs (log_id, level, message, context_json)
       VALUES (?, ?, ?, ?)`,
      [`log_${Date.now()}`, level, message, JSON.stringify(context)]
    );

    connection.release();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Errors
app.post('/api/errors', async (req, res) => {
  try {
    const { message, error, stack, playerName } = req.body;

    const connection = await pool.getConnection();

    await connection.execute(
      `INSERT INTO error_logs (error_id, error_message, error_stack, context_json)
       VALUES (?, ?, ?, ?)`,
      [`err_${Date.now()}`, message, stack, JSON.stringify({ playerName, error })]
    );

    connection.release();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health Check POST
app.post('/api/health', async (req, res) => {
  try {
    const { activePlayers, totalSyncs, successfulSyncs, failedSyncs } = req.body;

    const connection = await pool.getConnection();

    await connection.execute(
      `INSERT INTO health_checks (status_id, active_players, total_syncs, successful_syncs, failed_syncs)
       VALUES (?, ?, ?, ?, ?)`,
      [`health_${Date.now()}`, activePlayers, totalSyncs, successfulSyncs, failedSyncs]
    );

    connection.release();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════════════════════════

async function start() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  🌐 INVENTORY SYNC - NODE.JS API SERVER             ║`);
  console.log(`║  Port: ${PORT}                                            ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  // Initialize database
  const dbReady = await initializeDatabase();
  if (!dbReady) {
    console.log('[Server] ❌ Database initialization failed');
    process.exit(1);
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`[Server] ✅ API Server running on http://localhost:${PORT}`);
    console.log(`[Server] ✅ Ready for Minecraft connections\n`);
  });
}

start();

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════════════════════

process.on('unhandledRejection', (reason, promise) => {
  console.log(`[Error] Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  console.log(`[Error] Uncaught Exception: ${error.message}`);
});
