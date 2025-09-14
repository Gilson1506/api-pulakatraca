// backend/tests/test-pagarme.js
import fetch from 'node-fetch';

/**
 * Script para testar a integração com o gateway de pagamento Pagar.me
 * Execute com: node tests/test-pagarme.js
 */

const API_BASE_URL = 'http://localhost:3000/api';

// Função para testar a criação de um pagamento com cartão de crédito
async function testCreditCardPayment() {
  console.log('\n🧪 Testando pagamento com cartão de crédito...');
  
  const payload = {
    amount: 1000, // R$ 10,00
    customer: {
      name: 'Teste Cliente',
      email: 'teste@email.com',
      document: '12345678909',
      type: 'individual'
    },
    items: [
      {
        amount: 1000,
        description: 'Produto de teste',
        quantity: 1
      }
    ],
    payments: [
      {
        payment_method: 'credit_card',
        amount: 1000,
        credit_card: {
          installments: 1,
          card: {
            number: '4111111111111111',
            holder_name: 'Teste Cliente',
            exp_month: 12,
            exp_year: 2030,
            cvv: '123'
          }
        }
      }
    ]
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('✅ Resposta:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  }
}

// Função para testar a criação de um pagamento com PIX
async function testPixPayment() {
  console.log('\n🧪 Testando pagamento com PIX...');
  
  const payload = {
    amount: 1500, // R$ 15,00
    customer: {
      name: 'Teste Cliente',
      email: 'teste@email.com',
      document: '12345678909',
      type: 'individual'
    },
    items: [
      {
        amount: 1500,
        description: 'Produto de teste PIX',
        quantity: 1
      }
    ],
    payments: [
      {
        payment_method: 'pix',
        amount: 1500,
        pix: {
          expires_in: 3600
        }
      }
    ]
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('✅ Resposta:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  }
}

// As funções de consulta e cancelamento foram mantidas fora deste fluxo
// porque o backend atual não expõe essas rotas. Se você adicioná-las,
// reative testes semelhantes apontando para as novas rotas.

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes da integração com Pagar.me...');
  
  // Testar pagamento com cartão de crédito (rota existente POST /api/payments)
  await testCreditCardPayment();

  // Testar pagamento com PIX (rota existente POST /api/payments)
  await testPixPayment();
  
  console.log('\n✨ Testes concluídos!');
}

// Executar todos os testes
runTests().catch(error => {
  console.error('Erro ao executar testes:', error);
});