const requestIP = require('request-ip');
const nodeCache = require('node-cache');


const TIME_FRAME_IN_S = 10;
const TIME_FRAME_IN_MS = TIME_FRAME_IN_S * 1000;
const MS_TO_S = 1 / 1000;
const RPS_LIMIT = 2;

const ipMiddleware = async function (req, res, next) {
    console.log("I am in ipmiddleware")
    let clientIP = requestIP.getClientIp(req);
    console.log("clientIP address of requester", clientIP)
    
    updateCache(clientIP);
    const IPArray = IPCache.get(clientIP);
    console.log("IP array in line 17", IPArray)
    if (IPArray.length > 1) {
        console.log("I am in updatecache if cond")
        const rps = IPArray.length / ((IPArray[IPArray.length - 1] - IPArray[0]) * MS_TO_S);
        console.log("rps value", rps)
        if (rps > RPS_LIMIT) {
            console.log('You are hitting limit', clientIP);
        }
    }
    next();
};

const IPCache = new nodeCache();

IPCache.on('expired', (key, value) => {
    console.log("I am in ipCache.on")
    if (new Date() - value[value.length - 1] > TIME_FRAME_IN_MS) {
        IPCache.del(key);
    }
    else {
        console.log("I am in else of ipCache.on")
        const updatedValue = value.filter(function (element) {
            return new Date() - element < TIME_FRAME_IN_MS;
        });
        IPCache.set(key, updatedValue, TIME_FRAME_IN_S - (new Date() - updatedValue[0]) * MS_TO_S);
    }
});

const updateCache = (ip) => {
    console.log("I am in update cache")
    let IPArray = IPCache.get(ip) || [];
    console.log("IPArray in updatecache at line 48", IPArray)
    IPArray.push(new Date());
    console.log("IPArray in updatecache at line 50", IPArray)
    IPCache.set(ip, IPArray, (IPCache.getTtl(ip) - Date.now()) * MS_TO_S || TIME_FRAME_IN_S);
};

module.exports = ipMiddleware

//===================================================================================//
// const updateCache = (ip) => {
//     console.log("I am in updateCache fx in last", ip)
//     let IPArray = myCache.get(ip) || [];
//     console.log("array in updatecache before push", IPArray)
//     if ( IPArray.length==0 ) {
//         IPArray.push(ip);
//         console.log("1st if condition array in updatecache after push", IPArray)
//         myCache.set(ip, IPArray, 60);
//     } else if ( IPArray.length==1 ){
//         if (IPArray[0] == ip) {
//             console.log("This ip address alreday in use")
//             return 
//         } else {
//             IPArray.push(ip);
//             console.log("2nd if condition array in updatecache after push", IPArray)
//             // myCache.set(ip, IPArray, 60);
//             return
//         }
//     } else if ( IPArray.length > 1 ){
//         if (IPArray[0]) {
//             console.log("This ip address alreday in use")
//             return 
//         } else {
//             IPArray.push(ip);
//             console.log("3rd if condition array in updatecache after push", IPArray)
//             myCache.set(ip, IPArray, 60);
//         }
//     } 
// };


