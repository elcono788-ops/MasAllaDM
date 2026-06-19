// api/despachar-manual.js
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const transporadorCorreo = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

module.exports = async (req, res) => {
    // Este endpoint puede recibir la notificación de actualización de Supabase o una petición manual tuya
    const { referencia, secreto_admin } = req.body;

    // Medida de seguridad básica para que nadie más ejecute este endpoint externo
    if (secreto_admin !== process.env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // 1. Buscar la orden pendiente
        const { data: orden, error: errOrden } = await supabase
            .from('ventas_manuales')
            .select('*')
            .eq('referencia', referencia)
            .single();

        if (errOrden || !orden) return res.status(404).json({ error: 'Referencia no encontrada' });
        if (orden.estado === 'completado') return res.status(400).json({ error: 'Esta orden ya fue entregada' });

        // 2. Actualizar el estado de la orden a completado
        await supabase.from('ventas_manuales').update({ estado: 'completado' }).eq('referencia', referencia);

        // 3. Dar acceso al perfil del usuario dentro de la plataforma
        await supabase.from('perfiles').update({ tiene_acceso_pdf: true }).eq('id', orden.user_id);

        // 4. Enviar el correo electrónico con el PDF adjunto desde la carpeta pública portadas
        const opcionesCorreo = {
            from: `"Más Allá del Muro" <${process.env.SMTP_USER}>`,
            to: orden.email,
            subject: '¡Transferencia Recibida! - Tu Manuscrito PDF de Más Allá del Muro',
            text: `Hola ${orden.nombre},\n\nHemos verificado tu transferencia de manera exitosa.\n\nAdjunto a este correo electrónico encontrarás tu manuscrito en formato PDF listo para leer.\n\n¡Gracias por tu lectura y apoyo!`,
            attachments: [
                {
                    filename: 'Mas_Alla_Del_Muro.pdf',
                    path: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/portadas/Mas_Alla_Del_Muro.pdf`
                }
            ]
        };

        await transporadorCorreo.sendMail(opcionesCorreo);
        return res.status(200).json({ success: true, message: 'PDF despachado y cuenta actualizada correctamente.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};