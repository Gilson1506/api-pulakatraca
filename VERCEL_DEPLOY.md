# Deploy no Vercel - Backend Pagar.me

## Configuração das Variáveis de Ambiente

No painel do Vercel, configure as seguintes variáveis de ambiente:

### Variáveis Obrigatórias:
- `PAGARME_API_KEY`: Sua chave secreta do Pagar.me (formato: sk_test_... ou sk_live_...)
- `NODE_ENV`: production

### Como configurar no Vercel:

1. Acesse o painel do Vercel
2. Vá para o projeto
3. Clique em "Settings" > "Environment Variables"
4. Adicione as variáveis:
   - `PAGARME_API_KEY` = sua chave do Pagar.me
   - `NODE_ENV` = production

## Deploy

### Opção 1: Deploy via GitHub (Recomendado)
1. Faça push do código para o GitHub
2. Conecte o repositório no Vercel
3. Configure as variáveis de ambiente
4. Deploy automático

### Opção 2: Deploy via Vercel CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

## Estrutura do Projeto

```
backend/
├── index.js              # Arquivo principal
├── vercel.json          # Configuração do Vercel
├── package.json         # Dependências e scripts
├── .vercelignore        # Arquivos ignorados no deploy
├── routes/
│   └── pagarmeRoutes.js # Rotas da API
└── services/
    └── pagarmeService.js # Serviço do Pagar.me
```

## Endpoints Disponíveis

- `GET /` - Status da API
- `GET /env-check` - Verificar variáveis de ambiente
- `POST /api/payments` - Criar pagamento
- `POST /api/payments/generate-card-hash` - Gerar hash do cartão
- `GET /api/payments/qr-image` - Proxy para QR Code PIX
- `GET /api/payments/pix-details` - Detalhes da transação PIX

## Testando Localmente

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Executar em modo produção
npm start
```

## Troubleshooting

### Erro de CORS
- O CORS já está configurado no código
- Se houver problemas, verifique se o frontend está fazendo requisições para o domínio correto

### Erro de Variáveis de Ambiente
- Verifique se `PAGARME_API_KEY` está configurada no Vercel
- A chave deve começar com `sk_` (secret key)

### Timeout
- O Vercel tem timeout de 30 segundos para funções serverless
- Para operações longas, considere usar webhooks
