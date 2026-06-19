import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_nadm005_SUPABASE_URL,
  process.env.NEXT_PUBLIC_nadm005_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email, tipo, mensaje } = req.body;

    if (!email || !tipo || !mensaje) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Insertar el mensaje recibido directamente en Supabase
    const { data, error } = await supabase
      .from('contactos')
      .insert([{ email, tipo, mensaje, creado_en: new Date() }]);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Mensaje guardado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
