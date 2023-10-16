require('dotenv').config();
const serverless = require('serverless-http');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/fabric', require("./src/fabric/fabric-ca-client.route"));

console.log("i am in hnadler file")

// check for wallet exists

const CAClient = require('./src/fabric/CAClient');
let CAClientController = new CAClient();

const fs = require("fs")

async function walletCheck(){ 
  try {
    if (fs.existsSync("./wallet")) {
      console.log("wallet exists")
      
    } else {
      console.log("Wallet doest not exists. Please enroll admin.")
      let adminCheck = await CAClientController.registerAdmin();
      console.log("adminCheck is ",adminCheck)
   
      let adminUserCheck = await CAClientController.registerUser();
      console.log("result 2 is ",adminUserCheck)
    } 
  } catch(e) {
    console.log("An error occurred.")
    return e
  }
}

walletCheck()


const RouteType = require('./middleware/route-type');
const rType = new RouteType();

// app.get('/hello', function (req, res) {
//   console.log("i am in hello route")

// });

app.use('/aggregator', rType.aggregator, require("./src/chaincode/chaincode-route"));
app.use('/bcpUsers', rType.bcpUsers, require("./src/chaincode/chaincode-route"));


app.use('/bondFormalisation', rType.bondFormalisation, require("./src/chaincode/chaincode-route"));

app.use('/borrower', rType.borrower, require("./src/chaincode/chaincode-route"));
app.use('/borrowerParty',rType.borrowerParty, require("./src/chaincode/chaincode-route"));
app.use('/boxFileData', rType.boxFileData, require("./src/chaincode/chaincode-route"));
app.use('/broker',rType.broker, require("./src/chaincode/chaincode-route"));
app.use('/brokerGroup',rType.brokerGroup, require("./src/chaincode/chaincode-route"));

// unique id required. 
app.use('/consumerQueries',rType.consumerQueries, require("./src/chaincode/chaincode-route"));

// unique id required. 
app.use('/consumerRefernceData',rType.consumerRefernceData, require("./src/chaincode/chaincode-route"));


app.use('/document',rType.document, require("./src/chaincode/chaincode-route"));
app.use('/espUsers',rType.espUsers, require("./src/chaincode/chaincode-route"));
app.use('/guarantor',rType.guarantor, require("./src/chaincode/chaincode-route"));
app.use('/homeBuyerDetails',rType.homeBuyerDetails, require("./src/chaincode/chaincode-route"));
app.use('/investor',rType.investor, require("./src/chaincode/chaincode-route"));
app.use('/mbwPersonalData',rType.mbwPersonalData, require("./src/chaincode/chaincode-route"));
app.use('/mbwPropertyData',rType.mbwPropertyData, require("./src/chaincode/chaincode-route"));
app.use('/mbwScenarioData',rType.mbwScenarioData, require("./src/chaincode/chaincode-route"));
app.use('/mbwSettlementData',rType.mbwSettlementData, require("./src/chaincode/chaincode-route"));
app.use('/notification',rType.notification, require("./src/chaincode/chaincode-route"));
app.use('/osqoBond',rType.osqoBond, require("./src/chaincode/chaincode-route"));
app.use('/placement',rType.placement, require("./src/chaincode/chaincode-route"));
app.use('/property',rType.property, require("./src/chaincode/chaincode-route"));

// unique id required
app.use('/propertiesClasses',rType.propertiesClasses, require("./src/chaincode/chaincode-route"));

app.use('/propertyClasses',rType.propertyClasses, require("./src/chaincode/chaincode-route"));

// unique id required.
app.use('/propertyGrowthRates',rType.propertyGrowthRates, require("./src/chaincode/chaincode-route"));


app.use('/rateClass',rType.rateClass, require("./src/chaincode/chaincode-route"));
app.use('/scenario', rType.scenario, require("./src/chaincode/chaincode-route"));
app.use('/subAggregator',rType.subAggregator, require("./src/chaincode/chaincode-route"));
app.use('/tokenClass',rType.tokenClass, require("./src/chaincode/chaincode-route"));

// unique id required.
app.use('/tokenInstructions',rType.tokenInstructions, require("./src/chaincode/chaincode-route"));


app.use('/unitClass',rType.unitClass, require("./src/chaincode/chaincode-route"));// 


// unique id required.
app.use('/userBorrowerParties',rType.userBorrowerParties, require("./src/chaincode/chaincode-route"));

//unique id required.
app.use('/userBrockers',rType.userBrockers, require("./src/chaincode/chaincode-route"));

//unique id reuired.
app.use('/userInvestors',rType.userInvestors, require("./src/chaincode/chaincode-route"));


//unique id required.
app.use('/userOsqoBonds',rType.userOsqoBonds, require("./src/chaincode/chaincode-route"));

////unique id required.
app.use('/userOsqoCommons',rType.userOsqoCommons, require("./src/chaincode/chaincode-route"));

//unique id required.
app.use('/userOsqoEntities',rType.userOsqoEntities, require("./src/chaincode/chaincode-route"));

app.use('/users',rType.users, require("./src/chaincode/chaincode-route"));

//unique id required.
app.use('/userOls',rType.userOls, require("./src/chaincode/chaincode-route"));


app.use('/vendors',rType.vendors, require("./src/chaincode/chaincode-route"));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

console.log("server is running")
// module.exports = app;

module.exports = {
  app,
  hello: serverless(app),
};
