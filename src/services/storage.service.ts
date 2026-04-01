import { supabase } from './supabase';

export async function uploadComprovante(grupoId: string, uri: string): Promise<string> {
  try {
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `${grupoId}/${fileName}`;
    
    // Busca a imagem localmente e converte para Blob para o upload
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from('comprovantes')
      .upload(filePath, blob, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: false
      });

    if (error) {
      console.error('Erro no Supabase Storage:', error.message);
      throw error;
    }
    
    // Obter URL pública
    const { data: publicData } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(filePath);
      
    return publicData.publicUrl;
  } catch (error: any) {
    console.error('Falha no upload do comprovante:', error);
    throw new Error(error.message || 'Erro ao enviar imagem.');
  }
}
