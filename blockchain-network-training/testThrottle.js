const requestIP = require('request-ip');
const NodeCache = require('node-cache');
const myCache = new NodeCache()

const ipMiddleware = async function (req, res, next) {
    console.log("I am in ipmiddleware")
    let clientIP = requestIP.getClientIp(req);
    console.log("clientIP address of requester", clientIP)
    
    updateCache(clientIP);
    const IPArray = myCache.get(clientIP);
    console.log("array in ipmiddleware", IPArray)
    if (IPArray.length > 1) {
        if (IPArray[0]) {
            res.status(429)
            return res.send({
                message: 'System overloaded, try again at a later time.',
            })
        }
    }
    return next()
};

const updateCache = (ip) => {
    console.log("I am in updateCache fx in last", ip)
    let IPArray = myCache.get(ip) || [];
    console.log("array in updatecache before push", IPArray)
    if (IPArray.length > 1) {
        if (IPArray[0]) {
            console.log("This ip address alreday in use try after 1 minute")
        } else {
            IPArray.push(ip);
            console.log("inner if condition array in updatecache after push", IPArray)
            myCache.set(ip, IPArray, 60);
        }
        
    } else {
        IPArray.push(ip);
        console.log("outer if condition array in updatecache after push", IPArray)
        myCache.set(ip, IPArray, 60);
    }
};

module.exports = ipMiddleware


