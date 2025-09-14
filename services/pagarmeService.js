class PagarmeService {
  constructor(apiKey, baseUrl = 'https://api.pagar.me/core/v5') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  getHeaders() {
    return {
      'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async createOrder(orderData) {
    try {
      const orderPayload = this.prepareOrderPayload(orderData);

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(orderPayload)
      });

      // Tenta ler JSON; se falhar, lê como texto para não perder detalhes
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        const text = await response.text();
        responseData = { raw: text };
      }

      if (!response.ok) {
        console.error('❌ Pagar.me orders error status:', response.status);
        console.error('❌ Pagar.me orders response:', responseData);
        console.error('📦 Order payload sent:', orderPayload);
        const errorMessage =
          (Array.isArray(responseData.errors) && responseData.errors.map(e => e.message).join(' | ')) ||
          responseData.message ||
          'Erro na API do Pagar.me';

        const err = new Error(errorMessage);
        err.status = response.status;
        err.details = responseData;
        err.payload = orderPayload;
        throw err;
      }

      return responseData;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.errors?.[0]?.message || 'Erro ao consultar pedido';
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      console.error('Erro ao consultar pedido:', error);
      throw error;
    }
  }

  async cancelOrder(orderId) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/closed`, {
        method: 'POST', // corrigido (não PATCH)
        headers: this.getHeaders()
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.errors?.[0]?.message || 'Erro ao cancelar pedido';
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      throw error;
    }
  }

  preparePaymentPayload(payment) {
    const payload = {
      payment_method: payment.payment_method,
      amount: payment.amount
    };

    switch (payment.payment_method) {
      case 'credit_card':
        payload.credit_card = this.prepareCreditCardPayload(payment.credit_card);
        break;
      case 'debit_card':
        payload.debit_card = this.prepareDebitCardPayload(payment.debit_card);
        break;
      case 'pix':
        payload.pix = this.preparePixPayload(payment.pix);
        break;
    }

    return payload;
  }

  prepareOrderPayload(orderData) {
    // Mantém customer.document conforme esperado pela API v5
    const customer = { ...(orderData.customer || {}) };
    if (customer.document) {
      customer.document = String(customer.document).replace(/\D/g, '');
    }
    if (!customer.type) customer.type = 'individual';

    // Itens no formato esperado pela API/SDK
    const items = (orderData.items || []).map(it => ({
      amount: Number(it.amount),
      description: it.description || it.code || 'Item',
      quantity: Number(it.quantity || 1),
      category: it.category || 'ticket',
      ...(it.code ? { code: it.code } : {})
    }));

    const payload = {
      code: orderData.code || `order-${Date.now()}`,
      currency: orderData.currency || 'BRL',
      closed: true,
      customer,
      items,
      payments: orderData.payments.map(p => this.preparePaymentPayload(p)), // normalizar
      metadata: {
        system: 'PulaKatraca',
        created_at: new Date().toISOString()
      }
    };

    if (orderData.billing_address) {
      payload.billing_address = orderData.billing_address;
    }

    return payload;
  }

  prepareCreditCardPayload(creditCard) {
    return {
      installments: creditCard.installments || 1,
      statement_descriptor: 'PulaKatraca',
      card: {
        number: creditCard.card?.number?.replace(/\s/g, '') || creditCard.number,
        holder_name: creditCard.card?.holder_name || creditCard.holder_name,
        exp_month: parseInt(creditCard.card?.exp_month || creditCard.exp_month),
        exp_year: parseInt(creditCard.card?.exp_year || creditCard.exp_year),
        cvv: creditCard.card?.cvv || creditCard.cvv,
        options: {
          verify_card: true
        }
      },
      postback_url: creditCard.postback_url
    };
  }

  prepareDebitCardPayload(debitCard) {
    return {
      statement_descriptor: 'PulaKatraca',
      card: {
        number: debitCard.card?.number?.replace(/\s/g, ''),
        holder_name: debitCard.card?.holder_name,
        exp_month: parseInt(debitCard.card?.exp_month),
        exp_year: parseInt(debitCard.card?.exp_year),
        cvv: debitCard.card?.cvv,
        options: {
          verify_card: true
        }
      },
      postback_url: debitCard.postback_url
    };
  }

  preparePixPayload(pix) {
    return {
      expires_in: pix?.expires_in || 86400,
      additional_information: [
        { name: 'Sistema', value: 'PulaKatraca' }
      ]
    };
  }

  getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0];
  }
}

export default PagarmeService;
