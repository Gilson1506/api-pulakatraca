// backend/routes/pagarmeRoutes.js
import express from 'express';
import fetch from 'node-fetch';
import PagarmeService from '../services/pagarmeService.js';

const router = express.Router();

// A chave será lida dinamicamente por requisição para evitar problemas de ordem de importação

/**
 * Criar um pedido/pagamento
 */
router.post('/', async (req, res) => {
  try {
    // Ler a chave dinamicamente
    const PAGARME_API_KEY = process.env.PAGARME_API_KEY;
    // Validação da API key antes de qualquer chamada externa
    if (!PAGARME_API_KEY || typeof PAGARME_API_KEY !== 'string') {
      return res.status(500).json({
        success: false,
        error: 'PAGARME_API_KEY ausente no backend. Defina no arquivo backend/.env e reinicie o servidor.'
      });
    }
    if (!PAGARME_API_KEY.startsWith('sk_')) {
      return res.status(401).json({
        success: false,
        error: 'Chave inválida. Use a SECRET KEY (sk_...) no backend/.env, não a public key (pk_...).',
      });
    }

    const { amount, customer, payments } = req.body;

    // ✅ Validação básica
    if (!amount || !customer || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos. Verifique amount, customer e payments.'
      });
    }

    // console.log("🔥 PAGARME_API_KEY carregada:", PAGARME_API_KEY); // NÃO LOGAR SECRET EM PRODUÇÃO
    console.log("💳 Dados do pedido:", req.body);

    // Instanciar o service com a chave válida
    const pagarmeService = new PagarmeService(PAGARME_API_KEY);
    // Chamada ao service
    const responseData = await pagarmeService.createOrder(req.body);

    // Extrai atalho do PIX a partir de charges[].last_transaction (estrutura v5)
    const lastPixTx = Array.isArray(responseData?.charges)
      ? responseData.charges.find(c => (
          c?.payment_method === 'pix' ||
          c?.last_transaction?.payment_method === 'pix' ||
          c?.last_transaction?.transaction_type === 'pix'
        ))?.last_transaction
      : undefined;

    const pixShortcut = lastPixTx ? {
      status: lastPixTx.status,
      qr_code_base64: lastPixTx?.pix?.qr_code_base64 || lastPixTx?.qr_code_base64,
      qr_code: lastPixTx?.pix?.qr_code || lastPixTx?.qr_code,
      qr_code_url: lastPixTx?.qr_code_url,
      emv: lastPixTx?.pix?.emv,
      failure_reason:
        lastPixTx?.gateway_response?.message ||
        lastPixTx?.message ||
        lastPixTx?.status_reason ||
        undefined
    } : undefined;

    return res.status(201).json({
      success: true,
      id: responseData.id,
      status: responseData.status,
      payments: responseData.payments, // pode vir vazio na v5
      charges: responseData.charges,   // onde costuma vir o last_transaction
      pix: pixShortcut,                // atalho para o frontend
      last_transaction: lastPixTx      // diagnóstico completo (PIX não carrega dados sensíveis)
    });

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: error.details || error.raw || { note: 'sem-detalhes-retornados-pelo-servico' },
      pagarme_status: error.status || undefined,
      sent_payload: error.payload || undefined
    });
  }
});

/**
 * Gerar card_hash (novo card_id)
 */
router.post('/generate-card-hash', async (req, res) => {
  try {
    const { card } = req.body;

    if (!card) {
      return res.status(400).json({
        success: false,
        error: 'Objeto card ausente no body'
      });
    }

    const { number, holder_name, exp_month, exp_year, cvv } = card;

    if (!number || !holder_name || !exp_month || !exp_year || !cvv) {
      return res.status(400).json({
        success: false,
        error: 'Dados do cartão incompletos'
      });
    }

    // Ler a chave dinamicamente
    const PAGARME_API_KEY = process.env.PAGARME_API_KEY;
    if (!PAGARME_API_KEY || !PAGARME_API_KEY.startsWith('sk_')) {
      return res.status(500).json({ success: false, error: 'PAGARME_API_KEY ausente ou inválida no backend.' });
    }

    // Chamada à API do Pagar.me
    const response = await fetch('https://api.pagar.me/core/v5/cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(PAGARME_API_KEY + ':').toString('base64')}`
      },
      body: JSON.stringify({ number, holder_name, exp_month, exp_year, cvv })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro na API do Pagar.me:', responseData);
      return res.status(response.status).json({
        success: false,
        error: responseData.errors || responseData.message || 'Erro na API do Pagar.me'
      });
    }

    return res.status(200).json({
      success: true,
      card_hash: responseData.id
    });

  } catch (error) {
    console.error('❌ Erro ao gerar card_hash:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * Proxy seguro para exibir a imagem do QR Code do PIX sem problemas de CORS/Referer
 * Aceita apenas URLs do domínio da Pagar.me
 * GET /api/payments/qr-image?url=<qr_code_url>
 */
router.get('/qr-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Parâmetro url é obrigatório' });
    }

    // Segurança: permitir apenas domínios conhecidos da Pagar.me
    const allowedHosts = new Set(['api.pagar.me', 'pagar.me']);
    const parsed = new URL(url);
    if (![...allowedHosts].some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return res.status(400).json({ error: 'Host não permitido' });
    }

    // Buscar a imagem e repassar como stream
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falha ao obter imagem do QR' });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    // Dica de cache curto para evitar sobrecarga mas permitir reuso imediato
    res.setHeader('Cache-Control', 'public, max-age=60');
    const arrayBuffer = await response.arrayBuffer();
    return res.end(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Erro no proxy de QR:', err);
    return res.status(500).json({ error: 'Erro ao obter QR Code' });
  }
});

/**
 * Buscar detalhes da transação PIX para tentar obter o EMV/qr_code em texto
 * GET /api/payments/pix-details?transaction_id=tran_xxx
 */
router.get('/pix-details', async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (!transaction_id) {
      return res.status(400).json({ success: false, error: 'transaction_id é obrigatório' });
    }

    const PAGARME_API_KEY = process.env.PAGARME_API_KEY;
    if (!PAGARME_API_KEY || !PAGARME_API_KEY.startsWith('sk_')) {
      return res.status(500).json({ success: false, error: 'PAGARME_API_KEY ausente ou inválida no backend.' });
    }

    const url = `https://api.pagar.me/core/v5/transactions/${encodeURIComponent(transaction_id)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(PAGARME_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data?.errors || data?.message || 'Falha ao consultar transação' });
    }

    // Tentar mapear campos comuns
    const pix = {
      status: data?.status,
      qr_code_base64: data?.pix?.qr_code_base64 || data?.qr_code_base64,
      qr_code_url: data?.qr_code_url,
      qr_code: data?.pix?.qr_code || data?.qr_code, // pode ser EMV ou URL, depende do provedor
      emv: data?.pix?.emv
    };

    return res.json({ success: true, transaction_id, pix, raw: data });
  } catch (err) {
    console.error('Erro ao buscar detalhes PIX:', err);
    return res.status(500).json({ success: false, error: 'Erro ao buscar detalhes do PIX' });
  }
});

/**
 * Webhook do Pagar.me para receber notificações de status de pagamento
 * POST /api/payments/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:', JSON.stringify(req.body, null, 2));
    
    const { type, data } = req.body;
    
    // Validar se é um webhook válido do Pagar.me
    if (!type || !data) {
      console.log('❌ Webhook inválido: dados ausentes');
      return res.status(400).json({ success: false, error: 'Dados do webhook inválidos' });
    }

    // Processar diferentes tipos de notificação
    switch (type) {
      // Eventos de Cobrança (Charge)
      case 'charge.paid':
        await handleChargePaid(data);
        break;
      case 'charge.payment_failed':
        await handleChargePaymentFailed(data);
        break;
      case 'charge.pending':
        await handleChargePending(data);
        break;
      
      // Eventos de Pedido (Order)
      case 'order.canceled':
        await handleOrderCanceled(data);
        break;
      case 'order.closed':
        await handleOrderClosed(data);
        break;
      case 'order.created':
        await handleOrderCreated(data);
        break;
      case 'order.paid':
        await handleOrderPaid(data);
        break;
      case 'order.payment_failed':
        await handleOrderPaymentFailed(data);
        break;
      case 'order.updated':
        await handleOrderUpdated(data);
        break;
      
      // Eventos legados (manter compatibilidade)
      case 'transaction.status_changed':
        await handleTransactionStatusChange(data);
        break;
      case 'order.status_changed':
        await handleOrderStatusChange(data);
        break;
      case 'charge.status_changed':
        await handleChargeStatusChange(data);
        break;
      
      default:
        console.log(`ℹ️ Tipo de webhook não tratado: ${type}`);
    }

    // Sempre retornar 200 para o Pagar.me
    return res.status(200).json({ success: true, message: 'Webhook processado' });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    // Mesmo com erro, retornar 200 para evitar reenvios
    return res.status(200).json({ success: false, error: 'Erro interno' });
  }
});

/**
 * Processar mudança de status de transação
 */
async function handleTransactionStatusChange(data) {
  const { id, status, amount, payment_method } = data;
  
  console.log(`💳 Transação ${id} mudou para status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`💳 Método: ${payment_method}`);

  // Aqui você pode implementar sua lógica de negócio
  // Por exemplo: atualizar banco de dados, enviar email, etc.
  
  switch (status) {
    case 'paid':
      console.log('✅ Pagamento aprovado!');
      // Implementar lógica para pagamento aprovado
      break;
    case 'pending':
      console.log('⏳ Pagamento pendente...');
      // Implementar lógica para pagamento pendente
      break;
    case 'failed':
      console.log('❌ Pagamento falhou');
      // Implementar lógica para pagamento falhado
      break;
    case 'canceled':
      console.log('🚫 Pagamento cancelado');
      // Implementar lógica para pagamento cancelado
      break;
  }
}

/**
 * Processar mudança de status de pedido
 */
async function handleOrderStatusChange(data) {
  const { id, status } = data;
  console.log(`📦 Pedido ${id} mudou para status: ${status}`);
  
  // Implementar lógica específica para mudanças de pedido
}

/**
 * Processar mudança de status de cobrança
 */
async function handleChargeStatusChange(data) {
  const { id, status, payment_method } = data;
  console.log(`💸 Cobrança ${id} mudou para status: ${status}`);
  console.log(`💳 Método: ${payment_method}`);
  
  // Implementar lógica específica para mudanças de cobrança
}

// ===== EVENTOS ESPECÍFICOS DE COBRANÇA =====

/**
 * Cobrança paga
 */
async function handleChargePaid(data) {
  const { id, amount, payment_method, customer } = data;
  console.log(`✅ COBRANÇA PAGA! ID: ${id}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`💳 Método: ${payment_method}`);
  console.log(`👤 Cliente: ${customer?.name || 'N/A'}`);
  
  // Implementar lógica para cobrança paga
  // Ex: Ativar produto, enviar email de confirmação, etc.
}

/**
 * Cobrança com falha no pagamento
 */
async function handleChargePaymentFailed(data) {
  const { id, amount, payment_method, failure_reason } = data;
  console.log(`❌ FALHA NO PAGAMENTO! ID: ${id}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`💳 Método: ${payment_method}`);
  console.log(`🚫 Motivo: ${failure_reason || 'Não informado'}`);
  
  // Implementar lógica para falha no pagamento
  // Ex: Notificar cliente, tentar outro método, etc.
}

/**
 * Cobrança pendente
 */
async function handleChargePending(data) {
  const { id, amount, payment_method } = data;
  console.log(`⏳ COBRANÇA PENDENTE! ID: ${id}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`💳 Método: ${payment_method}`);
  
  // Implementar lógica para cobrança pendente
  // Ex: Aguardar confirmação, notificar cliente, etc.
}

// ===== EVENTOS ESPECÍFICOS DE PEDIDO =====

/**
 * Pedido cancelado
 */
async function handleOrderCanceled(data) {
  const { id, status, amount } = data;
  console.log(`🚫 PEDIDO CANCELADO! ID: ${id}`);
  console.log(`📦 Status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  
  // Implementar lógica para pedido cancelado
  // Ex: Estornar estoque, notificar cliente, etc.
}

/**
 * Pedido fechado
 */
async function handleOrderClosed(data) {
  const { id, status, amount } = data;
  console.log(`🔒 PEDIDO FECHADO! ID: ${id}`);
  console.log(`📦 Status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  
  // Implementar lógica para pedido fechado
  // Ex: Finalizar processamento, gerar relatório, etc.
}

/**
 * Pedido criado
 */
async function handleOrderCreated(data) {
  const { id, status, amount, customer } = data;
  console.log(`📦 PEDIDO CRIADO! ID: ${id}`);
  console.log(`📦 Status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`👤 Cliente: ${customer?.name || 'N/A'}`);
  
  // Implementar lógica para pedido criado
  // Ex: Reservar estoque, enviar confirmação, etc.
}

/**
 * Pedido pago
 */
async function handleOrderPaid(data) {
  const { id, status, amount, customer } = data;
  console.log(`✅ PEDIDO PAGO! ID: ${id}`);
  console.log(`📦 Status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`👤 Cliente: ${customer?.name || 'N/A'}`);
  
  // Implementar lógica para pedido pago
  // Ex: Processar envio, ativar serviço, etc.
}

/**
 * Pedido com falha no pagamento
 */
async function handleOrderPaymentFailed(data) {
  const { id, status, amount, failure_reason } = data;
  console.log(`❌ FALHA NO PAGAMENTO DO PEDIDO! ID: ${id}`);
  console.log(`📦 Status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`🚫 Motivo: ${failure_reason || 'Não informado'}`);
  
  // Implementar lógica para falha no pagamento do pedido
  // Ex: Liberar estoque, notificar cliente, etc.
}

/**
 * Pedido atualizado
 */
async function handleOrderUpdated(data) {
  const { id, status, amount, customer } = data;
  console.log(`🔄 PEDIDO ATUALIZADO! ID: ${id}`);
  console.log(`📦 Status: ${status}`);
  console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`);
  console.log(`👤 Cliente: ${customer?.name || 'N/A'}`);
  
  // Implementar lógica para pedido atualizado
  // Ex: Sincronizar dados, notificar mudanças, etc.
}

export default router;
