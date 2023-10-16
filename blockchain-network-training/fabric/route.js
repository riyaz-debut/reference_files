'use strict';

const express = require('express');
const router = express.Router();

const CAClient = require('./CAClient');
let CAClientController = new CAClient();

// Register Admin
router.post('/register-admin', function (req, res, next) {
    let result = CAClientController.registerAdmin();
    result.then(result => {
        res.status(result.status).json(result.data);
    }).catch(result => {
        res.status(500).json({ message: result.message });
    });
});

// Register User
router.post('/register-user', function (req, res, next) {
    let result = CAClientController.registerUser(req.body.username);
    result.then(result => {
        res.status(result.status).json(result.data);
    }).catch(result => {
        res.status(500).json({ message: result.message });
    });
});

module.exports = router;