const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { SimpleWalletClient } = require('./SimpleWalletClient');

const router = express.Router();

let sessionStorage = [];

router.get('/', (req, res) => {
    res.render('login');
});

router.get('/login', (req,res) => {
    res.render('login');
});

router.get('/deposit', (req,res) => {
    res.render('deposit');
});

router.get('/transfer', (req,res) => {
    res.render('transfer');
});

router.post('/login', (req,res) => {
    var name = req.body.name;
    if (name == "") {
       /*  alert("Please Enter User ID");
        window.location.href = '/login'; */
        console.error(`Please enter Name`);
    } 
    else{
        sessionStorage = [];
        sessionStorage.push(name);
        // some delay before redirecting to homepage
        // to allow sessionstorage to complete
        //setTimeout(null, 101);
        console.log(`sessionStorage: ${sessionStorage[0]}`);

    }
    res.send({message: `User Successfully Logged in as ${name}` }); 
});

router.post('/deposit', (req,res) => {
    let userName = req.body.name;
    let amount = req.body.depositAmount;
    //creating the user
    var SimpleWalletClient1 = new SimpleWalletClient(userName);
    console.log(`User ${userName} created successfully!!`);
    SimpleWalletClient1.deposit(amount);
    res.send({message:`Amount ${amount} successfully added!!`}); 

})

module.exports = router;