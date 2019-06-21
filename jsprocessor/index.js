'use strict'

const { TransactionProcessor } = require('sawtooth-sdk/processor');

//import { TransactionProcessor } from 'sawtooth-sdk/processor';

const SimpleWalletHandler = require('./SimpleWalletHandler');

if(process.argv.length < 3){
    console.log(`Missing Validator Address!!`);
    process.exit(1);
}

const address = process.argv[2];

const transactionProcessor = new TransactionProcessor(address);

transactionProcessor.addHandler(new SimpleWalletHandler());

transactionProcessor.start();