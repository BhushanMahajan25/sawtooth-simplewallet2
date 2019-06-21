'use strict'

const { TransactionHandler } = require('sawtooth-sdk/processor/handler');
//import { TransactionHandler } from 'sawtooth-sdk/processor/handler';
const { InvalidTransaction, InternalError } = require('sawtooth-sdk/processor/exceptions');
const crypto = require('crypto');
const { TextEncoder, TextDecoder } = require('text-encoding/lib/encoding');
const delay = require('delay');

const _hash = (x) => crypto.createHash('sha512').update(x).digest('hex').toLowerCase().substring(0,64);

var encoder = new TextEncoder('utf8');
var decoder = new TextDecoder('utf8');

const MIN_VALUE = 0;
const SW_FAMILY = 'simplewallet';
const SW_NAMESPACE = _hash(SW_FAMILY).substring(0,6);

//function to obtain payload from client
const _decodeRequest = (payload) => 
    new Promise((resolve, reject) => {
        payload = payload.toString().split(',');
        if (payload.length === 2) {
            resolve({
              action: payload[0],
              amount: payload[1]
            });
            console.log(`Payload: ${payload}`);
        }
        else if(payload.length === 3){
            resolve({
                action: payload[0],
                amount: payload[1],
                toKey: payload[2]
            });
            console.log(`Payload: ${payload}`);
        }
        else{
            let reason = new InvalidTransaction('Invalid Payload Serialization!!');
            reject(reason);
        }
    });

//function to display errors
const _toInternalError = (err) => {
    console.log(`in error message block`);
    let message = err.message ? err.message : err;
    throw new InternalError(message);
}

//function to set the entries in the block using "SetState" function
const _setEntry = (context, address, stateValue) => {
    console.log(`_setEntry: context: ${JSON.stringify(context)}`);
    console.log(`_setEntry: address: ${address}`);
    console.log(`_setEntry: strNewBalance: ${stateValue}`);
    let dataBytes = encoder.encode(stateValue);
    console.log(`dataBytes = ${dataBytes}`)
    let entries = {
        [address]: dataBytes
    }
    console.log(`entries: ${JSON.stringify(entries)}`);
    console.log(`context.setState(entries): ${context.setState(entries)}`);
    return context.setState(entries);
}
 
//function to make deposit transaction
const makeDeposit = (context, address, amount) => (possibleAddressValues) => {
    console.log('after 1min inside makeDeposit function');
    console.log(`Address paased to makeDeposit: ${address}`);
    let stateValueRep = possibleAddressValues[address];
    console.log(`stateValueRep: ${stateValueRep}`);

    let newBalance = 0;
    let balance;
    if(stateValueRep == null || stateValueRep == ''){
        console.log('No previous Deposits. Creating new Deposit.');
        newBalance = amount;
        console.log(`amount deposited first time\nnewBalance: ${newBalance}\namount:${amount}`);
    }
    else{
        balance = decoder.decode(stateValueRep);
        newBalance = parseInt(balance) + amount;
        console.log(`Amount Crediting: ${newBalance}`);
    }
    let strNewBalance = newBalance.toString();
    console.log(`mkdpst: context: ${JSON.stringify(context)}`);
    console.log(`mkdpst: address: ${address}`);
    console.log(`mkdpst: strNewBalance: ${strNewBalance}`);
    return _setEntry(context, address, strNewBalance);
}

//function to make transfer transaction
const makeTransfer = (context, senderAddress, amount, receiverAddress) => (possibleAddressValues) => {
    if(amount <= MIN_VALUE){
        throw new InvalidTransaction(`Amount is invalid`);
    }
    let senderBalance;
    let currentEntry = possibleAddressValues[senderAddress];
    let currentEntryTo = possibleAddressValues[receiverAddress];
    let senderNewBalance = 0;
    let receiverBalance;
    let receiverNewBalance = 0;
    if(currentEntry == null || currentEntry == ''){
        console.log(`No user (Debitor)`);
    }
    if(currentEntryTo == null || currentEntryTo == ''){
        console.log(`No user (Creditor)`);
    }
    
    senderBalance = decoder.decode(currentEntry);
    senderBalance = parseInt(senderBalance);

    receiverBalance = decoder.decode(currentEntryTo);
    receiverBalance = parseInt(receiverBalance);
    
    if(senderBalance < amount){
        throw new InvalidTransaction(`Not enough money to perform transfer operation`);
    }
    else{
        console.log(`Debiting amount ${amount} from the sender ${currentEntry}`);
        senderNewBalance = senderBalance - amount;
        console.log(`Crediting amount ${amount} to receiver ${currentEntryTo}`);
        receiverNewBalance = receiverBalance + amount;
        let stateData = senderNewBalance.toString();
        _setEntry(context, senderAddress, stateData);
        stateData = receiverNewBalance.toString();
        console.log(`Sender: ${currentEntry}\t  Balance: ${senderNewBalance}`);
        console.log(`Receiver: ${currentEntryTo}\t  Balance: ${receiverNewBalance}`);
        return _setEntry(context, receiverAddress, stateData);
    }
}


class SimpleWalletHandler extends TransactionHandler {
    constructor(){
        super(SW_FAMILY,['1.0'],[SW_NAMESPACE]);
    }
    apply(transactionProcessRequest, context){
        console.log(`transactionProcessRequest: ${JSON.stringify(transactionProcessRequest)}`);
        console.log(`transactionProcessRequest.payload: ${JSON.stringify(transactionProcessRequest.payload)}`);
        let payload = transactionProcessRequest.payload;
        var action, amount;
        var toKey = payload[2];
        payload = payload.toString().split(',');
        if (payload.length === 2) {
            action = payload[0];
            amount = payload[1];
            console.log(`Payload2: ${payload}`);
        }
        else if(payload.length === 3){
            /* resolve({
                action: payload[0],
                amount: payload[1],
                toKey: payload[2]
            }); */
            console.log(`Payload3: ${payload}`);
        }
        else{
            throw new InvalidTransaction('Invalid Payload Serialization!!')
        }
        console.log(`Action = ${action}`);
        console.log(`Amount = ${amount}`);
        console.log(`toKey = ${toKey}`);

        let header = transactionProcessRequest.header;
        let userPublicKey = header.signerPublicKey;

        if(!action){
            throw new InvalidTransaction(`Action is required!!`);
        }

        if(amount === null || amount === undefined){
            throw new InvalidTransaction(`Value is required!!`);
        }

        let d = new Date();
        let startMinutes = d.getMinutes();
        let endMinutes = 4;

        console.log(`startMinutes: ${startMinutes}`);
        console.log(`endMinutes: ${endMinutes}`);

        if(action === 'deposit'){
            let p = new Promise((resolve,reject) => {
                let timer = setInterval(()=>{
                    let startMinutes = new Date().getMinutes();
                    //console.log(`startMinutes inside: ${startMinutes}`);
                    if(startMinutes >= endMinutes){
                        console.log('From: Employer\nTo: Freelancer\nAmount: 1 BTC');
                        clearInterval(timer);
                        resolve(99);
                    }
                },1000);
            })
            
            p.then((flag) => {
                if(flag == 99){
                    console.log(`flag is ${flag}`);
                    let senderAddress = SW_NAMESPACE + _hash(userPublicKey).slice(-64);
                    let beneficiaryKey = toKey;
                    //let receiverAddress;
                    /* if(beneficiaryKey != undefined){
                        receiverAddress = SW_NAMESPACE + _hash(toKey).slice(-64);
                    } */
                    console.log(`context: ${JSON.stringify(context)}`);
                    console.log(`senderAddress: ${senderAddress}`);
                    let getPromise = context.getState([senderAddress]);
                    console.log(`getPromise: ${JSON.stringify(getPromise)}`);

                    let actionPromise = getPromise.then( 
                        makeDeposit(context, senderAddress, amount)
                    ); 
                    return actionPromise.then(addresses => {
                        console.log(`addresses: ${JSON.stringify(addresses)}`);
                        if(addresses.length === 0){
                            throw new InternalError(`State Error!!`);
                        }
                    });
                }
            });
        }
    }
}

module.exports = SimpleWalletHandler; 
        /* return _decodeRequest(transactionProcessRequest.payload)
        .catch(_toInternalError)
        .then((update) => {
            let header = transactionProcessRequest.header;
            let userPublicKey = header.signerPublicKey;
            let action = update.action;
            if(!update.action){
                throw new InvalidTransaction(`Action is required!!`);
            }
            let amount = update.amount;
            if(amount === null || amount === undefined){
                throw new InvalidTransaction(`Value is required!!`);
            }
            amount = parseInt(amount);
            if(typeof amount !== "number" || amount < MIN_VALUE){
                throw new InvalidTransaction(`Value must be an Integer ` + `no less than 1`);
            }

            //select action to be performed
            var actionFn;
            if(update.action === 'deposit'){
                actionFn = makeDeposit
            }
            else if(update.action === 'transfer'){
                actionFn = makeTransfer;
            }
            else{
                throw new InvalidTransaction(`Invalid Action: ${update.action}`);
            }

            let senderAddress = SW_NAMESPACE + _hash(userPublicKey).slice(-64);
            // this is the key obtained for the beneficiary in the payload,
            //used only during transfer function
            let beneficiaryKey = update.toKey;
            let receiverAddress;
            if(beneficiaryKey != undefined){
                receiverAddress = SW_NAMESPACE + _hash(update.toKey).slice(-64);
            }

            // Get the current state, for the key's address:
            let getPromise;
            if(update.action == 'transfer'){
                getPromise = context.getState([senderAddress, receiverAddress]);
            }
            else{
                getPromise = context.getState([senderAddress]);
            }
            let actionPromise = getPromise.then( 
                actionFn(context, senderAddress, amount, receiverAddress)
            ); 
            return actionPromise.then(addresses => {
                if(addresses.length === 0){
                    throw new InternalError(`State Error!!`);
                }
            });
        });
    } */
  