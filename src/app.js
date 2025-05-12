const express = require('express');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));
const port = 3000;

module.exports = app;