const { createHash } = require('crypto');
const { CryptoFactory, createContext } = require('sawtooth-sdk/signing');
const protobuf = require('sawtooth-sdk/protobuf');
const fs = require('fs');
const fetch = require('node-fetch');
const { Secp256k1PrivateKey } = require('sawtooth-sdk/signing/secp256k1');
const { TextEncoder, TextDecoder } = require('text-encoding/lib/encoding');
const rp =require('request-promise');

FAMILY_NAME = 'simplewallet';

function hash(v) {
    return createHash('sha512').update(v).digest('hex');
}

class SimpleWalletClient{
    constructor(name){
        console.log(`name: ${name}`);
        const privateKeyStrBuf = this.getUserPriKey(name);
       
        console.log('Got userprivkeyfile');
        const privateKeyStr = privateKeyStrBuf.toString().trim();
        const context = createContext('secp256k1');
        const privateKey = Secp256k1PrivateKey.fromHex(privateKeyStr);
        this.signer = new CryptoFactory(context).newSigner(privateKey);
        this.publicKey = this.signer.getPublicKey().asHex();
        this.address = hash('simplewallet').substr(0,6) + hash(this.publicKey).substr(0,64);
        console.log(`Storing at ${this.address}`);
    }

    deposit(amount){
        this._wrap_and_send("deposit",[amount]);
    }
    balance(){
        let amount = this._send_to_rest_api(null);
        return amount;
    }
    transfer(user2,amount){
        this._wrap_and_send("transfer",[amount,user2]);
    }

    getUserPriKey(name){
        console.log(`getUserPriKey(${name})`);
        console.log(`Current Working Directory is: ${process.cwd()}`);
        var userprivkeyfile = '../../.sawtooth/keys/'+name+'.priv';
        console.log('returning userprivkeyfile');
        return fs.readFileSync(userprivkeyfile);
    }
    getUserPubKey(name){
        console.log(`getUserPubKey(${name})`);
        console.log(`Current Working Directory is: ${process.cwd()}`);
        let userpubkeyfile = '../../.sawtooth/keys/'+name+'.pub';
        return fs.readFileSync(userpubkeyfile);
    }

    _wrap_and_send(action,values){
        var payload = ''
        const address = this.address;
        console.log("wrapping for: " + this.address);
        var inputAddressList = [address];
        var outputAddressList = [address];
        if(action === "transfer"){
            const pubKeyStrBuf = this.getUserPubKey(values[1]);
            const pubKeyStr = pubKeyStrBuf.toString().trim();
            var toAddress = hash("simplewallet").substr(0, 6) + hash(pubKeyStr).substr(0, 64);
            inputAddressList.push(toAddress);
            outputAddressList.push(toAddress);
            payload = action+","+values[0]+","+pubKeyStr;
        } 
        else{
            payload = action+","+values[0];
        }	
        var enc = new TextEncoder('utf8');
        const payloadBytes = enc.encode(payload);
        const transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: 'simplewallet',
            familyVersion: '1.0',
            inputs: inputAddressList,
            outputs: outputAddressList,
            signerPublicKey: this.signer.getPublicKey().asHex(),
            nonce: "" + Math.random(),
            batcherPublicKey: this.signer.getPublicKey().asHex(),
            dependencies: [],
            payloadSha512: hash(payloadBytes),
        }).finish();
        const transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: this.signer.sign(transactionHeaderBytes),
            payload: payloadBytes
        });
        const transactions = [transaction];
        const batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: this.signer.getPublicKey().asHex(),
            transactionIds: transactions.map((txn) => txn.headerSignature),
        }).finish();
        const batchSignature = this.signer.sign(batchHeaderBytes);
        const batch = protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: batchSignature,
            transactions: transactions,
        });
        const batchListBytes = protobuf.BatchList.encode({
            batches: [batch]
        }).finish();
        this._send_to_rest_api(batchListBytes);	
    }

    _send_to_rest_api(batchListBytes){
        if (batchListBytes == null) {
            var geturl = 'http://localhost:8008/state/'+this.address
            console.log("Getting from: " + geturl);
            return fetch(geturl, {
                method: 'GET',
            }).then((response) => response.json()).then((responseJson) => {
                var data = responseJson.data;
                var amount = new Buffer(data, 'base64').toString();
                return amount;
                }).catch((error) => {
                    console.error(error);
                    }); 	
        }
        else{
            console.log('inside post else');
            fetch('http://localhost:8008/batches', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: batchListBytes,
            }).then((response) => response.json()).then((responseJson) => {
                console.log(`My response: ${JSON.stringify(responseJson)}`);
                }).catch((error) => {
                    console.error(error);
                    }); 
        }
    }

    
}

module.exports.SimpleWalletClient = SimpleWalletClient;