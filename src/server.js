const express = require('express');
const {refreshToken, login, fetchTicket, fetchTickets} = require("./utils/lidl");
const {saveToken, getToken, isTokenExpired, getTicket, saveTicket} = require("./utils/data");
const app = express();

app.get('/token-status', async (req, res) => {
  const token = getToken();

  res.json({
    time: Date.now(),
    expires_at: token['expires_at'],
    diff: Date.now() - token['expires_at'],
    expired: isTokenExpired(),
  });
});

app.get('/new-tickets', async (req, res) => {
  let token = getToken();

  if (isTokenExpired()) {
    console.log('token expired');
    let newToken = null;

    if (token === null) {
      console.log('trying login...');
      newToken = await login();
    } else {
      console.log('refreshing token...');
      newToken = await refreshToken(token['refresh_token']);
    }

    saveToken(newToken);
    token = newToken;
  }

  console.log('get tickets');
  const tickets = await fetchTickets(token['access_token']);
  const newTickets = [];

  for (const ticket of tickets['tickets'].slice(0, 6)) {
    if (getTicket(ticket.id) === null) {
      const ticketData = await fetchTicket(token['access_token'], ticket.id);
      saveTicket(ticket.id, ticketData);
      newTickets.push(ticketData);
    }
  }

  res.json({
    newTickets
  });
});

app.listen(3000, () => {
  console.log(`Mock API listening on port 3000`);
});
