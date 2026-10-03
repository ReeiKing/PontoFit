// EXEMPLO — Vercel Serverless Function para GET/PUT /api/ficha (Fase 11).
// INATIVO: pastas com "_" dentro de /api não viram funções na Vercel.
// Para ativar: mova para api/ficha.js, instale as dependências e configure
// DATABASE_URL e a autenticação real (Auth.js, Supabase Auth ou Clerk).
//
//   npm i @neondatabase/serverless

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL); // segredo só em variável de ambiente

// Substituir pela verificação da sessão do provedor de autenticação escolhido.
async function usuarioDaSessao(req) {
  throw new Error('Implementar com Auth.js / Supabase Auth / Clerk');
}

export default async function handler(req, res) {
  let usuario;
  try {
    usuario = await usuarioDaSessao(req);
  } catch {
    return res.status(401).json({ erro: 'Sessão inválida.' });
  }

  if (req.method === 'GET') {
    const [ficha] = await sql`SELECT * FROM fichas WHERE usuario_id = ${usuario.id}`;
    return res.status(200).json(ficha || {});
  }

  if (req.method === 'PUT') {
    const f = req.body || {};
    // Consultas parametrizadas (sql`...`) evitam SQL injection.
    const [ficha] = await sql`
      INSERT INTO fichas (usuario_id, data_nascimento, sexo, telefone, cidade, estado,
                          altura_cm, peso_inicial_kg, data_peso_inicial, cintura_cm,
                          objetivo, nivel_atividade, condicoes_saude, alergias,
                          medicamentos, profissional, observacoes, meta_peso_kg, meta_data)
      VALUES (${usuario.id}, ${f.dataNascimento || null}, ${f.sexo || null}, ${f.telefone || null},
              ${f.cidade || null}, ${f.estado || null}, ${f.alturaCm}, ${f.pesoInicialKg},
              ${f.dataPesoInicial || null}, ${f.cinturaCm}, ${f.objetivo || null}, ${f.nivelAtividade || null},
              ${f.condicoesSaude || []}, ${f.alergias || null}, ${f.medicamentos || null},
              ${[f.profissionalNome, f.profissionalContato].filter(Boolean).join(' — ') || null},
              ${f.observacoes || null}, ${f.metaPesoKg}, ${f.metaData || null})
      ON CONFLICT (usuario_id) DO UPDATE SET
        data_nascimento = EXCLUDED.data_nascimento, sexo = EXCLUDED.sexo, telefone = EXCLUDED.telefone,
        cidade = EXCLUDED.cidade, estado = EXCLUDED.estado, altura_cm = EXCLUDED.altura_cm,
        peso_inicial_kg = EXCLUDED.peso_inicial_kg, data_peso_inicial = EXCLUDED.data_peso_inicial,
        cintura_cm = EXCLUDED.cintura_cm, objetivo = EXCLUDED.objetivo, nivel_atividade = EXCLUDED.nivel_atividade,
        condicoes_saude = EXCLUDED.condicoes_saude, alergias = EXCLUDED.alergias, medicamentos = EXCLUDED.medicamentos,
        profissional = EXCLUDED.profissional, observacoes = EXCLUDED.observacoes,
        meta_peso_kg = EXCLUDED.meta_peso_kg, meta_data = EXCLUDED.meta_data, atualizado_em = now()
      RETURNING *`;
    return res.status(200).json(ficha);
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ erro: 'Método não permitido.' });
}
