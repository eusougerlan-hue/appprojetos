import express from "express";
import path from "path";
import pg from "pg";
import crypto from "crypto";

const app = express();
const PORT = 3000;

function getValidUUID(id: any): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof id === "string" && uuidRegex.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

app.use(express.json());

// Database configuration
const dbConfig: any = {
  host: process.env.DB_HOST || "postgres-dev.saas.gwsistemas.com.br",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "dbmasteruser",
  password: process.env.DB_PASSWORD || "b12alpha1",
  database: process.env.DB_NAME || "time_projetos",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
};

const pool = new pg.Pool(dbConfig);

// Initialize DB schema
async function initDB() {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL successfully!");
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        cpf TEXT UNIQUE,
        password TEXT,
        role TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        usuario_movidesk TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY,
        razao_social TEXT NOT NULL,
        cnpj TEXT,
        ref_movidesk TEXT,
        contacts JSONB DEFAULT '[]'::jsonb,
        usuario_chave BOOLEAN DEFAULT false
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY,
        customer_id TEXT,
        razao_social TEXT,
        protocolo TEXT,
        modulos JSONB DEFAULT '[]'::jsonb,
        tipo_treinamento TEXT,
        solicitante TEXT,
        duracao_horas NUMERIC,
        residual_hours_added NUMERIC DEFAULT 0,
        data_inicio TEXT,
        data_fim TEXT,
        valor_implantacao NUMERIC,
        comissao_percent NUMERIC,
        status TEXT,
        responsavel_tecnico TEXT,
        commission_paid BOOLEAN DEFAULT false,
        observacao TEXT,
        comentario TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS training_logs (
        id UUID PRIMARY KEY,
        client_id TEXT,
        numero_protocolo TEXT,
        employee_id TEXT,
        employee_name TEXT,
        date TEXT,
        start_time_1 TEXT,
        end_time_1 TEXT,
        start_time_2 TEXT,
        end_time_2 TEXT,
        received_by JSONB DEFAULT '[]'::jsonb,
        observation TEXT,
        transport_type TEXT,
        uber_ida NUMERIC DEFAULT 0,
        uber_volta NUMERIC DEFAULT 0,
        uber_total NUMERIC DEFAULT 0,
        own_vehicle_km NUMERIC DEFAULT 0,
        own_vehicle_km_value NUMERIC DEFAULT 0,
        own_vehicle_total NUMERIC DEFAULT 0,
        horas_calculadas NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_modules (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS training_types (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS time_management_configs (
        id TEXT PRIMARY KEY,
        dias INTEGER DEFAULT 0,
        horas_por_dia INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id INTEGER PRIMARY KEY,
        api_key TEXT,
        webhook_url TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default admin user if none exists
    const adminCheck = await client.query("SELECT * FROM users WHERE cpf = '000.000.000-00' OR email = 'eusougerlan@gmail.com'");
    if (adminCheck.rows.length === 0) {
      const adminId = crypto.randomUUID();
      await client.query(`
        INSERT INTO users (id, name, phone, email, cpf, password, role, active, usuario_movidesk)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [adminId, "Gestor", "", "eusougerlan@gmail.com", "000.000.000-00", "admin", "MANAGER", true, ""]);
      console.log("Seeded default admin user!");
    }

    client.release();
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

// API Routes

// --- USERS ---
app.get("/api/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY name");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const user = req.body;
    const id = getValidUUID(user.id);
    await pool.query(`
      INSERT INTO users (id, name, phone, email, cpf, password, role, active, usuario_movidesk)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, user.name, user.phone, user.email, user.cpf, user.password, user.role, user.active !== false, user.usuario_movidesk]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const user = req.body;
    await pool.query(`
      UPDATE users 
      SET name = $1, phone = $2, email = $3, cpf = $4, password = $5, role = $6, active = $7, usuario_movidesk = $8
      WHERE id = $9
    `, [user.name, user.phone, user.email, user.cpf, user.password, user.role, user.active !== false, user.usuario_movidesk, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMERS ---
app.get("/api/customers", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM customers ORDER BY razao_social");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const customer = req.body;
    const id = getValidUUID(customer.id);
    const hasKeyUser = Array.isArray(customer.contacts) && customer.contacts.some((c: any) => c.keyUser);
    await pool.query(`
      INSERT INTO customers (id, razao_social, cnpj, ref_movidesk, contacts, usuario_chave)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, customer.razao_social, customer.cnpj, customer.ref_movidesk, JSON.stringify(customer.contacts || []), hasKeyUser]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const customer = req.body;
    const hasKeyUser = Array.isArray(customer.contacts) && customer.contacts.some((c: any) => c.keyUser);
    await pool.query(`
      UPDATE customers 
      SET razao_social = $1, cnpj = $2, ref_movidesk = $3, contacts = $4, usuario_chave = $5
      WHERE id = $6
    `, [customer.razao_social, customer.cnpj, customer.ref_movidesk, JSON.stringify(customer.contacts || []), hasKeyUser, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM customers WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- CLIENTS ---
app.get("/api/clients", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clients ORDER BY created_at DESC");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    const client = req.body;
    const id = getValidUUID(client.id);
    await pool.query(`
      INSERT INTO clients (
        id, customer_id, razao_social, protocolo, modulos, tipo_treinamento, solicitante,
        duracao_horas, residual_hours_added, data_inicio, data_fim, valor_implantacao,
        comissao_percent, status, responsavel_tecnico, commission_paid, observacao, comentario
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      id, client.customer_id, client.razao_social, client.protocolo, JSON.stringify(client.modulos || []),
      client.tipo_treinamento, client.solicitante, client.duracao_horas, client.residual_hours_added || 0,
      client.data_inicio, client.data_fim || null, client.valor_implantacao, client.comissao_percent,
      client.status, client.responsavel_tecnico, client.commission_paid || false, client.observacao, client.comentario
    ]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/clients/:id", async (req, res) => {
  try {
    const client = req.body;
    await pool.query(`
      UPDATE clients SET
        customer_id = $1, razao_social = $2, protocolo = $3, modulos = $4, tipo_treinamento = $5, solicitante = $6,
        duracao_horas = $7, residual_hours_added = $8, data_inicio = $9, data_fim = $10, valor_implantacao = $11,
        comissao_percent = $12, status = $13, responsavel_tecnico = $14, commission_paid = $15, observacao = $16, comentario = $17
      WHERE id = $18
    `, [
      client.customer_id, client.razao_social, client.protocolo, JSON.stringify(client.modulos || []),
      client.tipo_treinamento, client.solicitante, client.duracao_horas, client.residual_hours_added || 0,
      client.data_inicio, client.data_fim || null, client.valor_implantacao, client.comissao_percent,
      client.status, client.responsavel_tecnico, client.commission_paid || false, client.observacao, client.comentario,
      req.params.id
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/clients/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Partial updates for clients
app.patch("/api/clients/:id/status", async (req, res) => {
  try {
    const { status, data_fim, residual_hours_added } = req.body;
    let query = "UPDATE clients SET status = $1, data_fim = $2";
    const params = [status, data_fim];
    
    if (residual_hours_added !== undefined && residual_hours_added !== null) {
      query += ", residual_hours_added = $3 WHERE id = $4";
      params.push(residual_hours_added, req.params.id);
    } else {
      query += " WHERE id = $3";
      params.push(req.params.id);
    }
    
    await pool.query(query, params);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/clients/:id/commission", async (req, res) => {
  try {
    const { commission_paid } = req.body;
    await pool.query("UPDATE clients SET commission_paid = $1 WHERE id = $2", [commission_paid, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/clients/:id/comment", async (req, res) => {
  try {
    const { comentario } = req.body;
    await pool.query("UPDATE clients SET comentario = $1 WHERE id = $2", [comentario, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- LOGS ---
app.get("/api/logs", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM training_logs ORDER BY date DESC");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const log = req.body;
    const id = getValidUUID(log.id);
    await pool.query(`
      INSERT INTO training_logs (
        id, client_id, numero_protocolo, employee_id, employee_name, date, start_time_1, end_time_1,
        start_time_2, end_time_2, received_by, observation, transport_type, uber_ida, uber_volta,
        uber_total, own_vehicle_km, own_vehicle_km_value, own_vehicle_total, horas_calculadas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      id, log.client_id, log.numero_protocolo, log.employee_id, log.employee_name, log.date, log.start_time_1, log.end_time_1,
      log.start_time_2 || null, log.end_time_2 || null, JSON.stringify(log.received_by || []), log.observation, log.transport_type,
      log.uber_ida, log.uber_volta, log.uber_total, log.own_vehicle_km, log.own_vehicle_km_value, log.own_vehicle_total, log.horas_calculadas
    ]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/logs/:id", async (req, res) => {
  try {
    const log = req.body;
    await pool.query(`
      UPDATE training_logs SET
        client_id = $1, numero_protocolo = $2, employee_id = $3, employee_name = $4, date = $5, start_time_1 = $6, end_time_1 = $7,
        start_time_2 = $8, end_time_2 = $9, received_by = $10, observation = $11, transport_type = $12, uber_ida = $13, uber_volta = $14,
        uber_total = $15, own_vehicle_km = $16, own_vehicle_km_value = $17, own_vehicle_total = $18, horas_calculadas = $19
      WHERE id = $20
    `, [
      log.client_id, log.numero_protocolo, log.employee_id, log.employee_name, log.date, log.start_time_1, log.end_time_1,
      log.start_time_2 || null, log.end_time_2 || null, JSON.stringify(log.received_by || []), log.observation, log.transport_type,
      log.uber_ida, log.uber_volta, log.uber_total, log.own_vehicle_km, log.own_vehicle_km_value, log.own_vehicle_total, log.horas_calculadas,
      req.params.id
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/logs/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM training_logs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- MODULES ---
app.get("/api/modules", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM system_modules ORDER BY name");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/modules", async (req, res) => {
  try {
    const module = req.body;
    const id = getValidUUID(module.id);
    await pool.query("INSERT INTO system_modules (id, name) VALUES ($1, $2)", [id, module.name]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/modules/:id", async (req, res) => {
  try {
    const module = req.body;
    await pool.query("UPDATE system_modules SET name = $1 WHERE id = $2", [module.name, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/modules/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM system_modules WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- TRAINING TYPES ---
app.get("/api/training-types", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM training_types ORDER BY name");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/training-types", async (req, res) => {
  try {
    const type = req.body;
    const id = getValidUUID(type.id);
    await pool.query("INSERT INTO training_types (id, name) VALUES ($1, $2)", [id, type.name]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/training-types/:id", async (req, res) => {
  try {
    const type = req.body;
    await pool.query("UPDATE training_types SET name = $1 WHERE id = $2", [type.name, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/training-types/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM training_types WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- TIME CONFIGS ---
app.get("/api/time-configs/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM time_management_configs WHERE id = $1", [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/time-configs", async (req, res) => {
  try {
    const config = req.body;
    await pool.query(`
      INSERT INTO time_management_configs (id, dias, horas_por_dia, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        dias = EXCLUDED.dias,
        horas_por_dia = EXCLUDED.horas_por_dia,
        updated_at = NOW()
    `, [config.id, config.dias, config.horas_por_dia]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- BRANDING & INTEGRATIONS ---
app.get("/api/central-config", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM integrations WHERE id = 1");
    if (rows.length > 0) {
      const row = rows[0];
      console.log("DEBUG /api/central-config GET:", JSON.stringify(row));
      try {
        const parsed = JSON.parse(row.webhook_url || "{}");
        res.json({
          appName: row.api_key || "TrainMaster",
          webhookUrl: parsed.webhookUrl || "",
          integrationApiKey: parsed.integrationApiKey || "",
          appSubtitle: parsed.appSubtitle || "SISTEMA PRO",
          logoUrl: parsed.logoUrl || ""
        });
      } catch {
        res.json({
          appName: row.api_key || "TrainMaster",
          webhookUrl: row.webhook_url || "",
          integrationApiKey: row.api_key || "",
          appSubtitle: "SISTEMA PRO",
          logoUrl: ""
        });
      }
    } else {
      res.json({
        appName: "TrainMaster",
        webhookUrl: "",
        integrationApiKey: "",
        appSubtitle: "SISTEMA PRO",
        logoUrl: ""
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/central-config", async (req, res) => {
  try {
    const { appName, webhookUrl, integrationApiKey, appSubtitle, logoUrl } = req.body;
    const jsonPayload = JSON.stringify({
      webhookUrl: webhookUrl || "",
      integrationApiKey: integrationApiKey || "",
      appSubtitle: appSubtitle || "SISTEMA PRO",
      logoUrl: logoUrl || ""
    });
    await pool.query(`
      INSERT INTO integrations (id, api_key, webhook_url, updated_at)
      VALUES (1, $1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET
        api_key = EXCLUDED.api_key,
        webhook_url = EXCLUDED.webhook_url,
        updated_at = NOW()
    `, [appName || "TrainMaster", jsonPayload]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/manifest.json", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM integrations WHERE id = 1");
    let appName = "TrainMaster Pro";
    let appSubtitle = "Gestão Avançada de Treinamentos de Software";
    
    if (rows.length > 0) {
      appName = rows[0].api_key || "TrainMaster Pro";
      try {
        const parsed = JSON.parse(rows[0].webhook_url || "{}");
        appSubtitle = parsed.appSubtitle || "Gestão Avançada de Treinamentos de Software";
      } catch {}
    }

    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      "name": appName,
      "short_name": appName.split(" ")[0] || appName,
      "description": appSubtitle,
      "theme_color": "#2563eb",
      "background_color": "#f8fafc",
      "display": "standalone",
      "orientation": "portrait",
      "start_url": "/",
      "id": "/",
      "scope": "/",
      "icons": [
        {
          "src": "/api/app-logo",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "/api/app-logo",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "/api/app-logo",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ]
    });
  } catch (error) {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      "name": "TrainMaster Pro",
      "short_name": "TrainMaster",
      "description": "Gestão Avançada de Treinamentos de Software",
      "theme_color": "#2563eb",
      "background_color": "#f8fafc",
      "display": "standalone",
      "orientation": "portrait",
      "start_url": "/",
      "id": "/",
      "scope": "/",
      "icons": [
        {
          "src": "/icon.svg",
          "sizes": "192x192",
          "type": "image/svg+xml",
          "purpose": "any"
        },
        {
          "src": "/icon.svg",
          "sizes": "512x512",
          "type": "image/svg+xml",
          "purpose": "any"
        }
      ]
    });
  }
});

app.get("/api/app-logo", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM integrations WHERE id = 1");
    let logoUrl = "";
    if (rows.length > 0) {
      try {
        const parsed = JSON.parse(rows[0].webhook_url || "{}");
        logoUrl = parsed.logoUrl || "";
      } catch {}
    }
    
    if (logoUrl) {
      if (logoUrl.startsWith("data:")) {
        const matches = logoUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.send(buffer);
        }
      } else {
        return res.redirect(logoUrl);
      }
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(path.join(process.cwd(), "public", "icon.svg"));
  } catch {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(path.join(process.cwd(), "public", "icon.svg"));
  }
});

app.get("/api/cloud-config", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM integrations WHERE id = 2");
    if (rows.length > 0) {
      res.json({
        url: rows[0].webhook_url,
        key: rows[0].api_key
      });
    } else {
      res.json(null);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/cloud-config", async (req, res) => {
  try {
    const { url, key } = req.body;
    await pool.query(`
      INSERT INTO integrations (id, api_key, webhook_url, updated_at)
      VALUES (2, $1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET
        api_key = EXCLUDED.api_key,
        webhook_url = EXCLUDED.webhook_url,
        updated_at = NOW()
    `, [key, url]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export app for serverless deployment (e.g., Vercel)
export default app;

// Vite Middleware & SPA Fallback setup
async function startServer() {
  await initDB();

  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start local server if not on Vercel
if (!process.env.VERCEL) {
  startServer();
} else {
  // On Vercel, run database initialization on module load
  initDB().catch(err => {
    console.error("Database initialization failed under Vercel serverless:", err);
  });
}
