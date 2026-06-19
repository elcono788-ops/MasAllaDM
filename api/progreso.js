import { createClient } from '@supabase/supabase-js';

// Usamos los nombres exactos de las variables que ya están en tu panel de Vercel
const supabase = createClient(
  process.env.NEXT_PUBLIC_nadm005_SUPABASE_URL,
  process.env.NEXT_PUBLIC_nadm005_SUPABASE_ANON_KEY
);
// ... el resto del código (handler) se queda exactamente igual
export default async function handler(req, res) {
  // Permitir solo peticiones POST (para guardar) y GET (para consultar)
  if (req.method === 'POST') {
    try {
      const { user_id, capitulo_id, escuchado, leido } = req.body;

      if (!user_id || !capitulo_id) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
      }

      // Guardar o actualizar el progreso en Supabase
      const { data, error } = await supabase
        .from('progreso_lectura')
        .upsert(
          { user_id, capitulo_id, escuchado, leido, ultimo_cambio: new Date() },
          { onConflict: 'user_id,capitulo_id' }
        )
        .select();

      if (error) throw error;

      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } 
  
  if (req.method === 'GET') {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({ error: 'Falta el ID de usuario' });
      }

      // Obtener todo el progreso de este usuario
      const { data, error } = await supabase
        .from('progreso_lectura')
        .select('capitulo_id, escuchado, leido')
        .eq('user_id', user_id);

      if (error) throw error;

      return res.status(200).json({ success: true, progreso: data });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
