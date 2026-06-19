// api/crear-orden-manual.js
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
    if (req.method !== 'POST') return res.status(455).json({ error: 'Método no permitido' });

    const { userId, email, nombre, apellido } = req.body;
    
    // Generar una referencia única aleatoria de 4 dígitos para el concepto bancario
    const codigoAleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referenciaUnica = `MADM-${codigoAleatorio}`;

    try {
        // 1. Insertar orden en la base de datos
        const { error } = await supabase
            .from('ventas_manuales')
            .insert([{ 
                user_id: userId, 
                nombre, 
                apellido, 
                email, 
                referencia: referenciaUnica,
                estado: 'pendiente'
            }]);

        if (error) throw new Error(error.message);

        // 2. Enviar correo informativo con los datos de transferencia
        const opcionesCorreo = {
            from: `"Más Allá del Muro" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Instrucciones de pago - Referencia ${referenciaUnica}`,
            text: `Hola ${nombre} ${apellido},\n\nHas solicitado el manuscrito en PDF de "Más Allá del Muro".\n\nPara completar tu adquisición, realiza una transferencia bancaria por $100.00 MXN con los siguientes datos:\n\nBanco: [Tu Banco]\nCLABE: [Tu CLABE]\nBeneficiario: [Tu Nombre]\n\nIMPORTANTE: En el concepto de la transferencia debes colocar obligatoriamente: ${referenciaUnica}\n\nEn cuanto recibamos la transferencia en nuestra cuenta, el sistema te enviará el PDF de forma automática.`
        };

        await transporadorCorreo.sendMail(opcionesCorreo);

        return res.status(200).json({ success: true, referencia: referenciaUnica });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};