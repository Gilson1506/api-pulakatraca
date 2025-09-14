# 🚀 Instruções de Deploy no Vercel

## ✅ Configuração Concluída

Seu backend está totalmente configurado para deploy no Vercel! Aqui estão os arquivos criados/modificados:

### Arquivos de Configuração:
- ✅ `vercel.json` - Configuração principal do Vercel
- ✅ `package.json` - Scripts e dependências atualizados
- ✅ `.vercelignore` - Arquivos ignorados no deploy
- ✅ `VERCEL_DEPLOY.md` - Documentação completa
- ✅ `test-vercel.js` - Script de teste

## 🎯 Próximos Passos

### 1. Instalar Vercel CLI (se ainda não tiver)
```bash
npm install -g vercel
```

### 2. Login no Vercel
```bash
vercel login
```

### 3. Deploy do Projeto
```bash
# Deploy de teste
vercel

# Deploy para produção
vercel --prod
```

### 4. Configurar Variáveis de Ambiente
No painel do Vercel:
1. Acesse seu projeto
2. Vá em "Settings" > "Environment Variables"
3. Adicione:
   - `PAGARME_API_KEY` = sua chave do Pagar.me (sk_test_...)
   - `NODE_ENV` = production

## 🔧 Testando Localmente

```bash
# Testar configuração
npm test

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📋 Endpoints Disponíveis

Após o deploy, seus endpoints estarão disponíveis em:
- `https://seu-projeto.vercel.app/` - Status da API
- `https://seu-projeto.vercel.app/env-check` - Verificar variáveis
- `https://seu-projeto.vercel.app/api/payments` - Criar pagamento
- `https://seu-projeto.vercel.app/api/payments/generate-card-hash` - Gerar hash do cartão
- `https://seu-projeto.vercel.app/api/payments/qr-image` - Proxy QR Code PIX
- `https://seu-projeto.vercel.app/api/payments/pix-details` - Detalhes PIX

## 🛠️ Troubleshooting

### Erro de CORS
- Já configurado no código
- Verifique se o frontend está usando a URL correta

### Erro de Variáveis de Ambiente
- Verifique se `PAGARME_API_KEY` está configurada no Vercel
- A chave deve começar com `sk_`

### Timeout
- Vercel tem timeout de 30 segundos
- Para operações longas, use webhooks

## 🎉 Pronto!

Seu backend está configurado e pronto para deploy no Vercel!
