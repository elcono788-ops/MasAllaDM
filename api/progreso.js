import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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