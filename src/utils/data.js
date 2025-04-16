const fs = require('node:fs');

const DATA_DIR = './data';
const TOKEN_FILE = `${DATA_DIR}/token.json`;

const getToken = () => {
  if (!fs.existsSync(TOKEN_FILE)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch (error) {
    throw new Error(`Token: ${error.message}`);
  }
}

const isTokenExpired = () => {
  try {
    const token = getToken();

    return Date.now() > token['expires_at'];
  } catch (error) {
    return true;
  }
}

const saveToken = (token) => {
  token['expires_at'] = Date.now() + token['expires_in'] * 1000

  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
  } catch (error) {
    throw new Error(`Token: ${error.message}`);
  }
}

const getTicket = (id) => {
  const ticketPath = `${DATA_DIR}/${id}.json`;

  if (!fs.existsSync(ticketPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(ticketPath, 'utf-8'));
  } catch (error) {
    throw new Error(`Ticket: ${error.message}`);
  }
}

const saveTicket = (id, ticket) => {
  try {
    fs.writeFileSync(`${DATA_DIR}/${id}.json`, JSON.stringify(ticket, null, 2));
  } catch (error) {
    throw new Error(`Token: ${error.message}`);
  }
}

module.exports = { getToken, saveToken, getTicket, isTokenExpired, saveTicket };
