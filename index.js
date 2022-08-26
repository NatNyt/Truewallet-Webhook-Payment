const express = require('express');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');

const app = express();
const transtion = {
    waiting: {}, 
    done: {}
};
app.set('trust proxy', true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
function randomchar(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}
const phone = "0123456789";
const jwtSecret = "JWT";
const port = 8080;


app.post('/api/v1/payment/truewallet', (req, res) => {
    if(req.body.amount && req.body.userId && req.body.phone){
        const trainstionID = randomchar(Math.random() * 32);
        const timeout = new Date().getTime() * 5 * 60 * 1000;
        const data = {
            amount: req.body.amount,
            userID: req.body.userId,
            phone: req.body.phone,
            timeout: timeout
        }
        const qrcodePayload = `//ascendmoney://wallet.truemoney.co.th/app/660000000005?type=constant&method=${querystring.escape(JSON.stringify({tmn_phone: phone, tmn_amount: req.body.amount, tmn_msg: trainstionID}))}`
        transtion.waiting[trainstionID] = data;
        return res.status(200).send({trainstionID: trainstionID, qrcodePayload: qrcodePayload});
    }else{
        return res.status(400).json({_error: 'Invaild Form Body'});
    }
})
setInterval(() => {
    for (var i = 0; i < Object.keys(transtion.waiting).length; i++) {
        const v = transtion.waiting[Object.keys(transtion.waiting)[i]]
        const date = new Date().getTime();
        if(date >= v.timeout){
            delete transtion.waiting[Object.keys(transtion.waiting)[i]];
        }
    }
    
})
app.post('/api/v1/internal/truewallet/webhook', async (req, res) => {
    if(req.body.message){
        jwt.verify(req.body.message, jwtSecret, (err, data) => {
            if(err) {
                console.log(err);
                return res.status(500).json({_error: 'Invaild JWT'})
            }else{
                if(data.message){
                    const result = Object.keys(transtion.waiting).find((e, i) => i === data.message);
                    if(result.phone == data.sender_mobile && result.amount == (data.amount / 100)){
                        transtion.done[data.message] = {
                            status: 'success',
                            amount: (data.amount / 100),
                            userID: transtion.waiting[Object.keys(transtion.waiting)[data.message]].userID
                        }
                        delete transtion.waiting[Object.keys(transtion.waiting)[data.message]];
                        return res.status(200).json({success: true});
                    }
                }else{
                    return res.status(400).json({_error: 'Invaild Form Body'});
                }
            }
        });
    }else{
        return res.status(400).json({_error: 'Invaild Form Body'});
    }
})
app.get('/api/v1/payment/truewallet/:tr/status', (req, res) => {
    if(req.params.tr){
        const tr = req.params.tr
        const waiting = transtion.waiting[tr];
        const done = transtion.done[tr];
        if(waiting){
            return res.status(200).json({status: 'Wating for payment', code: 0});
        }else if(done){
            return res.status(200).json({status: 'Done', code: 1, data: done});
        }else{
            return res.status(200).json({status: 'Payment is expreid or not requested', code: 2});
        }
    }else{
        return res.status(400).json({_error: 'Invaild Form Body'});
    }
})
app.listen(port, () => console.log('listening on port ' + port));
