const axios = require('axios');
const {Issuer, generators} = require("openid-client");
const puppeteer = require("puppeteer");
const {waitForRequest} = require("./puppeteer");
const qs = require("querystring");
const iPhone = (puppeteer.KnownDevices)['iPhone X'];
require('dotenv').config();

const TICKETS_ENDPOINT = 'https://tickets.lidlplus.com';
const ACCOUNTS_ENDPOINT = 'https://accounts.lidl.com';
const LIDL_EMAIL = process.env.LIDL_EMAIL;
const LIDL_PASSWORD = process.env.LIDL_PASSWORD;
const DEBUG = ['true', '1', 1].indexOf(process.env.DEBUG) !== -1;

const fetchTickets = async (accessToken) => {
  try {
    const response = await axios.get(
      `${TICKETS_ENDPOINT}/api/v2/PL/tickets?pageNumber=1&onlyFavorite=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'okhttp/4.10.0',
          'App': 'com.lidl.eci.lidlplus',
          'App-Version': '999.99.9',
          'Model': 'sdk_gphone64_arm64',
          'Accept-Encoding': 'gzip',
          'Accept-Language': 'PL'
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Lidl getTickets error: ${error.message}`);
  }
}

const fetchTicket = async (accessToken, ticketId) => {
  try {
    const response = await axios.get(
      `${TICKETS_ENDPOINT}/api/v3/PL/tickets/${ticketId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'okhttp/4.10.0',
          'App': 'com.lidl.eci.lidlplus',
          'App-Version': '999.99.9',
          'Model': 'sdk_gphone64_arm64',
          'Accept-Encoding': 'gzip',
          'Accept-Language': 'PL'
        }
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Lidl getTicket error: ${error.message}`);
  }
}

const refreshToken = async (refresh_token) => {
  try {
    const request = `refresh_token=${refresh_token}&grant_type=refresh_token`;

    const response = await axios({
      method: 'POST',
      url: `${ACCOUNTS_ENDPOINT}/connect/token`,
      data: request,
      headers: {
        'Authorization': `Basic ${Buffer.from('LidlPlusNativeClient:secret').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(request)
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Lidl refreshToken error: ${error.message}`);
  }
}

const login = async () => {
  const openIdIssuer = await Issuer.discover(ACCOUNTS_ENDPOINT)
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  const client = new openIdIssuer.Client({
    client_id: 'LidlPlusNativeClient',
    redirect_uris: ['com.lidlplus.app://callback'],
    response_types: ['code']
  });

  const loginUrl = client.authorizationUrl({
    scope: 'openid profile offline_access lpprofile lpapis',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    Country: 'PL',
    language: 'PL-PL'
  });

  const browserConfig = {
    slowMo: 10,
    args: ['--no-sandbox'],
  };

  if (DEBUG) {
    browserConfig.headless = false;
    browserConfig.devtools = true;
  }

  const browser = await puppeteer.launch(browserConfig);

  const page = await browser.newPage();
  await page.emulate(iPhone);

  try {
    console.log('Go to login page.');
    await page.goto(loginUrl);

    console.log('Wait for login button.');
    await page.waitForSelector('button[data-testid="button-primary"]');
    await page.click('button[data-testid="button-primary"]');

    console.log('Fill email.');
    await page.click('input[name="input-email"]');
    await page.keyboard.type(LIDL_EMAIL);

    await new Promise(r => setTimeout(r, 200));

    console.log('Fill password.');
    await page.click('input[name="Password"]');
    await page.keyboard.type(LIDL_PASSWORD);

    const requestPromise = waitForRequest(
      page,
      'com.lidlplus.app://callback',
      10000
    );

    console.log('Click submit.');
    await page.waitForSelector('button[data-testid="button-primary"]');
    await page.click('button[data-testid="button-primary"]');

    console.log('Waiting for response.');
    const requestData = await requestPromise;
    console.log('Received request to:', requestData.url);

    const authCode = requestData.query.code;

    if (!authCode) {
      throw new Error('Authorization code not found in callback URL');
    }

    const tokenUrl = `${ACCOUNTS_ENDPOINT}/connect/token`;
    const headers = {
      'Authorization': 'Basic TGlkbFBsdXNOYXRpdmVDbGllbnQ6c2VjcmV0',
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    const formData = {
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: 'com.lidlplus.app://callback',
      code_verifier: codeVerifier
    };

    const response = await axios.post(
      tokenUrl,
      qs.stringify(formData),
      { headers: headers }
    );

    return response.data;
  } catch (error) {
    console.error('Lidl login error:', error.message);
    throw new Error(`Lidl login error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

module.exports = { fetchTickets, fetchTicket, refreshToken, login };
