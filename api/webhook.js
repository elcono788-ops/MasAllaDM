// api/webhook.js
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const transporadorCorreo = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Vercel requiere desactivar el parseo automático para leer el body en crudo (raw) exigido por Stripe
export const config = {
    api: {
        bodyParser: false,
    },
};

const buffer = async (readable) => {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(455).send('Método inválido');

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const emailCliente = session.customer_details.email;
        const nombreCliente = session.metadata.nombreCompleto;

        // Actualizar Supabase utilizando el ID guardado en metadatos
        const { error } = await supabase
            .from('perfiles')
            .update({ tiene_acceso_pdf: true })
            .eq('id', userId);

        if (error) {
            console.error("Error en Supabase:", error);
            return res.status(500).send("Error interno de base de datos");
        }

        // Configuración de correo electrónico adjuntando la ruta desde tu carpeta Public
        // Dentro de api/webhook.js, modifica la constante opcionesCorreo:

const opcionesCorreo = {
    from: `"Más Allá del Muro" <${process.env.SMTP_USER}>`,
    to: emailCliente,
    subject: '¡Confirmación de Transferencia y Entrega del Manuscrito!',
    text: `Hola ${nombreCliente},\n\nHemos recibido con éxito tu transferencia bancaria por $100.00 MXN.\n\nAdjunto a este correo encontrarás el manuscrito completo de la novela en formato PDF.\n\nMuchas gracias por tu apoyo al proyecto.`,
    attachments: [
        {
            filename: 'Mas_Alla_Del_Muro.pdf',
            // Apunta de manera directa a la subcarpeta dentro de Public en tu dominio de Vercel
            path: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/portadas/Mas_Alla_Del_Muro.pdf`
        }
    ]
};

        try {
            await transporadorCorreo.sendMail(opcionesCorreo);
            console.log("Correo enviado con éxito a:", emailCliente);
        } catch (mailErr) {
            console.error("Fallo enviando correo electrónico:", mailErr);
        }
    }

    return res.status(200).json({ received: true });
};