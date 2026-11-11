import crypto from 'crypto';

const VA = process.env.IPAYMU_VA;
const API_KEY = process.env.IPAYMU_API_KEY;
const URL = process.env.IPAYMU_URL || 'https://sandbox.ipaymu.com';

export async function createPayment(params) {
  if (!VA || !API_KEY) {
    throw new Error('iPaymu credentials missing');
  }

  const path = '/api/v2/payment';
  const method = 'POST';
  
  const body = {
    product: [params.product],
    qty: ['1'],
    price: [params.amount],
    returnUrl: params.returnUrl || (process.env.WEBHOOK_DOMAIN ? `${process.env.WEBHOOK_DOMAIN}/payment-success` : 'https://google.com'),
    cancelUrl: params.cancelUrl || (process.env.WEBHOOK_DOMAIN ? `${process.env.WEBHOOK_DOMAIN}` : 'https://google.com'),
    notifyUrl: params.notifyUrl || (process.env.WEBHOOK_DOMAIN ? `${process.env.WEBHOOK_DOMAIN}/api/ipaymu/callback` : 'https://google.com'),
    referenceId: params.referenceId,
    buyerName: params.buyerName,
    buyerPhone: params.buyerPhone,
    feeDirection: 'BUYER'
  };

  const strBody = JSON.stringify(body);
  const hash = crypto.createHash('sha256').update(strBody).digest('hex');
  const stringToSign = `${method}:${VA}:${hash}:${API_KEY}`;
  
  const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

  const response = await fetch(`${URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'va': VA,
      'signature': signature,
      'timestamp': new Date().getTime().toString()
    },
    body: strBody
  });

  const json = await response.json();
  if (json.Status !== 200) {
    throw new Error(`iPaymu error: ${json.Message}`);
  }
  return json.Data; // Contains SessionID, Url, etc.
}

export async function checkTransaction(transactionId) {
  if (!VA || !API_KEY) throw new Error('iPaymu credentials missing');

  const path = '/api/v2/transaction';
  const method = 'POST';
  
  const body = { transactionId };
  const strBody = JSON.stringify(body);
  const hash = crypto.createHash('sha256').update(strBody).digest('hex');
  const stringToSign = `${method}:${VA}:${hash}:${API_KEY}`;
  const signature = crypto.createHmac('sha256', API_KEY).update(stringToSign).digest('hex');

  const response = await fetch(`${URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'va': VA,
      'signature': signature,
      'timestamp': new Date().getTime().toString()
    },
    body: strBody
  });

  const json = await response.json();
  if (json.Status !== 200) {
    throw new Error(`iPaymu check error: ${json.Message}`);
  }
  return json.Data; // Contains Status (1=Pending, 2=Berhasil, etc.)
}
