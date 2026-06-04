// ── Flip for Business Disbursement Service ────────────────────
// Docs: https://docs.flip.id/
// Sandbox base URL: https://bigflip.id/big_sandbox_api/v2
// Production base URL: https://bigflip.id/api/v2
const axios = require('axios');

const FLIP_API_URL          = process.env.FLIP_API_URL       || 'https://bigflip.id/api/v2';
const FLIP_SECRET           = process.env.FLIP_SECRET_KEY    || '';
const FLIP_VALIDATION_TOKEN = process.env.FLIP_VALIDATION_TOKEN || '';

// Bank Account Inquiry always uses v2 (Flip pinned, no v3)
// Derive inquiry base URL from main URL
const FLIP_INQUIRY_URL = FLIP_API_URL.includes('big_sandbox_api')
  ? 'https://bigflip.id/big_sandbox_api/v2'
  : 'https://bigflip.id/api/v2';

// Axios instance — Basic Auth, secret key as username, empty password
const flipApi = axios.create({
  baseURL: FLIP_API_URL,
  auth:    { username: FLIP_SECRET, password: '' },
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 30000,
});

// Separate instance for inquiry (always v2)
const flipInquiryApi = axios.create({
  baseURL: FLIP_INQUIRY_URL,
  auth:    { username: FLIP_SECRET, password: '' },
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 30000,
});

// ── Get bank list ─────────────────────────────────────────────
const getBanks = async () => {
  const r = await flipApi.get('/general/banks');
  return r.data;
};

// ── Validate bank account (inquiry) ──────────────────────────
// Endpoint: POST /disbursement/bank-account-inquiry
// Docs: https://docs.flip.id/docs/api/account-inquiry/
const validateBankAccount = async (bankCode, accountNumber) => {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code:      bankCode,
  });
  const r = await flipInquiryApi.post('/disbursement/bank-account-inquiry', params);
  // Response: { bank_code, account_number, account_holder, status }
  return r.data;
};

// ── Create single disbursement ────────────────────────────────
// Endpoint: POST /disbursement
// Docs: https://docs.flip.id/docs/api/money-transfer/create-disbursement
const createDisbursement = async ({ idempotencyKey, amount, bankCode, accountNumber, accountName, remark }) => {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code:      bankCode,
    amount:         Math.round(amount),
    remark:         (remark || 'Gaji').substring(0, 18), // max 18 chars
  });
  const r = await flipApi.post('/disbursement', params, {
    headers: { 'idempotency-key': idempotencyKey },
  });
  return r.data;
  // { id, amount, status, timestamp, bank_code, account_number, recipient_name, ... }
};

// ── Get disbursement status ───────────────────────────────────
const getDisbursementStatus = async (disbursementId) => {
  const r = await flipApi.get(`/disbursement/${disbursementId}`);
  return r.data;
};

// ── Get disbursement list ─────────────────────────────────────
const getDisbursementList = async ({ page = 1, pagination = 20 } = {}) => {
  const r = await flipApi.get(`/disbursement?pagination=${pagination}&page=${page}`);
  return r.data;
};

// ── Validate webhook token ────────────────────────────────────
const validateWebhook = (token) => {
  return token === FLIP_VALIDATION_TOKEN;
};

// ── Map Flip status → internal status ────────────────────────
const mapStatus = (flipStatus) => {
  const map = {
    'PENDING':   'PENDING',
    'PROCESSED': 'PENDING',
    'DONE':      'DONE',
    'FAILED':    'FAILED',
    'CANCELLED': 'CANCELLED',
  };
  return map[flipStatus] || 'PENDING';
};

// ── Indonesian bank list supported by Flip ────────────────────
const BANK_LIST = [
  { code: 'bca',       name: 'BCA' },
  { code: 'bni',       name: 'BNI' },
  { code: 'bri',       name: 'BRI' },
  { code: 'mandiri',   name: 'Mandiri' },
  { code: 'bsi',       name: 'BSI' },
  { code: 'cimb',      name: 'CIMB Niaga' },
  { code: 'danamon',   name: 'Danamon' },
  { code: 'permata',   name: 'Permata' },
  { code: 'btn',       name: 'BTN' },
  { code: 'panin',     name: 'Panin' },
  { code: 'mega',      name: 'Bank Mega' },
  { code: 'bukopin',   name: 'Bukopin' },
  { code: 'sinarmas',  name: 'Sinar Mas' },
  { code: 'ocbc',      name: 'OCBC NISP' },
  { code: 'uob',       name: 'UOB' },
  { code: 'muamalat',  name: 'Muamalat' },
  { code: 'maybank',   name: 'Maybank' },
  { code: 'jago',      name: 'Bank Jago' },
  { code: 'allo',      name: 'Allo Bank' },
  { code: 'seabank',   name: 'SeaBank' },
  { code: 'neo',       name: 'Bank Neo Commerce' },
  { code: 'blu',       name: 'blu by BCA' },
  { code: 'gopay',     name: 'GoPay' },
  { code: 'ovo',       name: 'OVO' },
  { code: 'dana',      name: 'DANA' },
  { code: 'shopeepay', name: 'ShopeePay' },
];

module.exports = {
  getBanks, validateBankAccount,
  createDisbursement, getDisbursementStatus, getDisbursementList,
  validateWebhook, mapStatus, BANK_LIST,
};
