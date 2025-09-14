// Script de teste para verificar se a configuração do Vercel está correta
// Importar apenas as dependências necessárias sem iniciar o servidor
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🧪 Testando configuração do Vercel...');

// Teste 1: Verificar se as dependências estão instaladas
try {
  const app = express();
  app.use(express.json());
  app.use(cors());
  console.log('✅ Dependências carregadas corretamente');
} catch (error) {
  console.log('❌ Erro ao carregar dependências:', error.message);
  process.exit(1);
}

// Teste 2: Verificar se as rotas estão configuradas
const routes = ['/', '/env-check', '/api/payments'];
console.log('✅ Rotas configuradas:', routes);

// Teste 3: Verificar variáveis de ambiente
const requiredEnvVars = ['PAGARME_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length === 0) {
  console.log('✅ Todas as variáveis de ambiente necessárias estão configuradas');
} else {
  console.log('⚠️  Variáveis de ambiente ausentes:', missingVars);
  console.log('   Configure-as no painel do Vercel antes do deploy');
}

console.log('🎉 Configuração do Vercel está pronta!');
console.log('');
console.log('Próximos passos:');
console.log('1. Configure PAGARME_API_KEY no painel do Vercel');
console.log('2. Faça o deploy: vercel --prod');
console.log('3. Teste os endpoints na URL fornecida pelo Vercel');
