// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pagarmeRoutes from './routes/pagarmeRoutes.js';

// Carregar variáveis de ambiente explicitamente de backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Primeiro tenta backend/.env (mesma pasta deste arquivo); se falhar, tenta .env da raiz
const loaded = dotenv.config({ path: path.join(__dirname, '.env') });
if (loaded.error) {
  dotenv.config();
}

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Configuração da porta
const PORT = process.env.PORT || 3000;

// Log de diagnóstico sobre variáveis de ambiente (não expõe o valor)
console.log('🔎 ENV HAS PAGARME_API_KEY:', !!process.env.PAGARME_API_KEY);

// Rota principal para teste
app.get('/', (req, res) => {
  res.send('✅ API de integração com Pagar.me rodando!');
});

// Rota de debug para checar se a chave está carregada (não expõe valor)
app.get('/env-check', (req, res) => {
  res.json({ has_pagarme_key: !!process.env.PAGARME_API_KEY, port: PORT });
});

// Rotas de pagamento
app.use('/api/payments', pagarmeRoutes);

// Iniciar servidor (apenas se não estiver rodando no Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}

// Exportar para Vercel
export default app;
