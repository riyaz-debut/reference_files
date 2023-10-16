// import { axios } from 'axios';
const axios = require('axios');
// const fetch = require('fetch')

const baseUrl = 'http://54.88.210.182:3000/order';


let failed = [];
const proxyFun = async() => {

    let OrderId = 330001;

    for(let i of Array(1000).keys()) {

        // console.log(`********************** Flow Started ${i} ********************** `);
        try {
            

            // await createOrder(OrderId+i);
            // await updateOrder(OrderId+i).catch((err)=>{ console.log('err')});
            // await deleteOrder(OrderId+i);
             createOrder(OrderId+i).then( ()=>{
                // deleteOrder(OrderId+i)
                updateOrder(OrderId+i).then(()=>{

                    deleteOrder(OrderId+i)
                })
               
            }).catch(()=>{
                console.log("9r890238423848234897")
            }) 
            
            // console.log(`********************** Flow Completed ${i} ********************** `);
            // return data;
        } catch (err) {
            console.log(`********************** Flow Failed ${i} ********************** `,err);
        }
    }

    // console.log(" ====== FAILED ===========") 
    
}

const createOrder = async(orderId)=>{    
    let payload  = {
        "orderId" : `${orderId}`,
        "country" : "India",
        "orderNo" : "03",
        "main_Quantity" : "100",
        "baseFactor" : "Qty",
        "order_Status" : "created",
        "farm_Gate_Price" : "10000",
        "region" : "India",
        "farm_360_Fee" : "100",
        "exporter_Cost" : "100",
        "importer_Cost" : "100",
        "importer_Delivery_date" : "07-02-2023",
        "exporter_Delivery_date" : "07-02-2023",
        "fob" : "testOrder",
        "elevation" : "testorder"
    }

    // console.table(payload)
    await callApi('',payload,'POST');
    console.log(`Order ${orderId} created`)
}


const updateOrder = async(orderId)=>{    
    let payload  = {
        "orderId" : `${orderId}`,
        "mill_delivery_data" : "testData",
        "user_coop_details " : "testDetails",
        "user_farmer_details" : "testFarmerDetails",
        "destination_port" : "Gujrat",
        "warehouse" : "Pakistan",
        "order_Status" : "accepted"
    }

    await callApi(`/${orderId}`,payload,'PUT');
    console.log(`Order ${orderId} updated`)
}

const deleteOrder = async(orderId)=>{
    
    await callApi(`/${orderId}`,{},'DELETE');
    console.log(`Order ${orderId} deleted`)
}

const callApi = async(url,payload, method) => {
    
    try {
        const response = await axios({
        url: `${baseUrl}${url}`,
         method,
         headers: {
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic eGZhcm11c2VyOnhmYXJtcHc='
          },
          data: payload
        });
    // const data = await response();
    return response;
    }
    catch(err) {
        console.log(`Failed Order `,err)
        failed.push(payload.orderId)
        return 
        // return Promise.reject(err);
    }
}

module.exports = { proxyFun }