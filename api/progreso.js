import nodemailer from 'nodemailer';

// Configuración del transportador de nodemailer usando variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.CORREO_HOST, // Ej: smtp.gmail.com
  port: parseInt(process.env.CORREO_PORT || '465'),
  secure: process.env.CORREO_SECURE === 'true', // true para puerto 465, false para otros
  auth: {
    user: process.env.CORREO_EMISOR,
    pass: process.env.CORREO_PASSWORD, // Contraseña de aplicación
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email, tipo, mensaje } = req.body;

    if (!email || !tipo || !mensaje) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const mailOptions = {
      from: `"Portal Más Allá del Muro" <${process.env.CORREO_EMISOR}>`,
      to: process.env.CORREO_EMISOR,
      subject: `Nueva ${tipo} de lector - Más Allá del Muro`,
      html: `
        <h2>Nuevo mensaje recibido desde la página web</h2>
        <p><strong>Remitente (Lector):</strong> ${email}</p>
        <p><strong>Tipo de mensaje:</strong> ${tipo}</p>
        <p><strong>Mensaje:</strong></p>
        <div style="padding: 15px; background-color: #f4f4f4; border-left: 4px solid #123456;">
          ${mensaje.replace(/\n/g, '<br>')}
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Mensaje enviado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
