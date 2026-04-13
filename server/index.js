// ============================================================
//  TOLIMA PRECISO — Backend Server
//  Stack: Node.js + Express + better-sqlite3 + MercadoPago SDK
// ============================================================

require("dotenv").config()
const express = require("express")
const path = require("path")
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago")

/* ─── Config ─────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || "TEST-REPLACE-WITH-YOUR-TOKEN"
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`

/* ─── Mercado Pago client ────────────────────────────────── */
const mpClient = new MercadoPagoConfig({ accessToken: MP_TOKEN })
const preference = new Preference(mpClient)
const payment = new Payment(mpClient)

/* ─── Supabase database ────────────────────────────────────── */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* ─── Helpers ─────────────────────────────────────────────── */
const PLANES = {
  urbano: { nombre: "Plan Urbano — Tolima Preciso", precio: 350000 },
  rural: { nombre: "Plan Rural — Tolima Preciso", precio: 800000 },
  monitoreo: {
    nombre: "Seguridad Catastral Anual — Tolima Preciso",
    precio: 50000,
  },
}

/* ─── Express app ─────────────────────────────────────────── */
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../public")))

/* ═══════════════════════════════════════════════════════════
   ROUTES — Clientes
   ═══════════════════════════════════════════════════════════ */

/**
 * POST /api/clientes
 * Registra una consulta gratuita en la base de datos.
 */
app.post('/api/clientes', async (req, res) => {
  const { nombre, telefono, email, predial, municipio } = req.body;

  if (!nombre || !telefono || !email || !predial || !municipio) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert([{ nombre, telefono, email, predial, municipio }])
    .select();

  if (error) {
    console.error(error.message);
    return res.status(500).json({ error: 'Error DB' });
  }

  res.status(201).json({
    mensaje: 'Consulta registrada correctamente.',
    id: data[0].id,
  });
});

/**
 * GET /api/clientes
 * Lista todos los clientes (solo para uso administrativo interno).
 * Proteger con autenticación antes de exponer en producción.
 */
app.get("/api/clientes", async (_req, res) => {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    console.error(error.message);
    return res.status(500).json({ error: "Error DB" });
  }

  res.json(data);
});

/* ═══════════════════════════════════════════════════════════
   ROUTES — Pagos / Mercado Pago
   ═══════════════════════════════════════════════════════════ */

/**
 * POST /api/pagos/crear-preferencia
 * Crea una preferencia de pago en Mercado Pago y devuelve init_point.
 */
app.post('/api/pagos/crear-preferencia', async (req, res) => {
  const { plan, nombre, email, telefono, predial } = req.body;

  const planInfo = PLANES[plan];

  // 1. Insertar en Supabase
  const { data, error } = await supabase
    .from('pagos')
    .insert([{
      cliente_nombre: nombre,
      cliente_email: email,
      cliente_telefono: telefono,
      predial,
      plan,
      monto: planInfo.precio
    }])
    .select();

  if (error) {
    return res.status(500).json({ error: 'Error DB' });
  }

  const pagoId = data[0].id;

  // 2. MercadoPago (igual que antes)
  const prefData = await preference.create({
    body: {
      items: [{
        id: `tolima-preciso-${plan}`,
        title: planInfo.nombre,
        quantity: 1,
        unit_price: planInfo.precio,
        currency_id: 'COP'
      }],
      external_reference: String(pagoId),
      notification_url: `${BASE_URL}/api/pagos/webhook`
    }
  });

  // 3. Actualizar
  await supabase
    .from('pagos')
    .update({ mp_preference_id: prefData.id })
    .eq('id', pagoId);

  res.json({
    init_point: prefData.init_point,
    pago_id: pagoId
  });
});

/**
 * POST /api/pagos/webhook
 * Recibe notificaciones IPN de Mercado Pago para actualizar el estado del pago.
 */
app.post('/api/pagos/webhook', async (req, res) => {
  res.sendStatus(200);

  const { type, data } = req.body;
  if (type !== 'payment') return;

  const paymentData = await payment.get({ id: data.id });

  const estadoMap = {
    approved: 'aprobado',
    rejected: 'rechazado',
    pending: 'pendiente',
  };

  await supabase
    .from('pagos')
    .update({
      mp_payment_id: paymentData.id,
      estado: estadoMap[paymentData.status] || paymentData.status,
      actualizado_en: new Date()
    })
    .eq('id', paymentData.external_reference);

  console.log('Pago actualizado');
});

/**
 * GET /api/pagos
 * Lista todos los pagos (solo uso administrativo).
 */
app.get("/api/pagos", async (_req, res) => {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    console.error(error.message);
    return res.status(500).json({ error: "Error DB" });
  }

  res.json(data);
});

/* ─── Fallback → SPA ──────────────────────────────────────── */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"))
})

/* ─── Start ───────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`✅  Tolima Preciso corriendo en http://localhost:${PORT}`)
})
