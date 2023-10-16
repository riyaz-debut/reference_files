package main

import (

	//admin route file path
	// chaincodeRouter "integra-nock-sdk/admin/adminRoutes"

	//client packages
	chaincodeRouter "integra-nock-sdk/chaincode-route"
	// clientRouter "integra-nock-sdk/client/client_route"

	"log"

	database "integra-nock-sdk/database"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	cors "github.com/rs/cors/wrapper/gin"
	_ "github.com/spacemonkeygo/openssl"
)

// var configProvider = configImpl.FromFile("./connection-org1.yaml")
// var sdk *fabsdk.FabricSDK
// var mspClient *msp.Client

func main() {
	// var err error

	log.Println("inside main file")

	// log.Println("Setup the SDK")
	// sdk, err = fabsdk.New(configProvider)
	// if err != nil {
	// 	panic("error while initialising sdk configuration" + err.Error())
	// }

	// mspClient, err := msp.New(sdk.Context(), msp.WithCAInstance("ca.org1.example.com"))
	// if err != nil {
	// 	panic("error while initialising sdk configuration" + err.Error())
	// }

	// err = mspClient.Enroll("org1admin", msp.WithSecret("org1adminpw"))
	// if err != nil {
	// 	log.Println(err.Error())
	// }
	// log.Println("msp client created")

	// // create client for resource management in fabric
	// log.Println("**** Setup resmgmt client for Orderer")
	// resmgmtClient, err := resmgmt.New(sdk.Context(fabsdk.WithUser("org1admin"), fabsdk.WithOrg("Org1")))
	// if err != nil {
	// 	panic(err)
	// }

	//Org 2

	// mspClient, err := msp.New(sdk.Context(), msp.WithCAInstance("ca.org2.example.com"))
	// if err != nil {
	// 	panic("error while initialising sdk configuration" + err.Error())
	// }

	// //TBD register
	// //TBD wallet

	// err = mspClient.Enroll("org2admin", msp.WithSecret("org2adminpw"))
	// if err != nil {
	// 	log.Println(err.Error())
	// }
	// log.Println("msp client created")

	// // create client for resource management in fabric
	// log.Println("**** Setup resmgmt client for Orderer")
	// resmgmtClient, err := resmgmt.New(sdk.Context(fabsdk.WithUser("org2admin"), fabsdk.WithOrg("Org2")))
	// if err != nil {
	// 	panic(err)
	// }

	// log.Println("Calling Lifecycle method")
	// createCCLifecycle(resmgmtClient, sdk)

	//database connection

	config :=
		database.Config{
			ServerName: "localhost:3305",
			User:       "riyaz",
			Password:   "Welcome01",
			DB:         "integradb",
		}

	connectionString := database.GetConnectionString(config)
	err := database.Connect(connectionString)
	if err != nil {
		panic(err.Error())
	}

	// chaincodeController.AddOrg(1)

	router := gin.Default()
	router.Use(cors.Default())

	router.GET("/", chaincodeRouter.InstallAll)

	// router.POST("/chaincode/upload", chaincodeRouter.UploadFile)
	// router.POST("/chaincode/download", chaincodeRouter.FileDownload)

	//sign new added org by others

	//joinchannel
	// router.POST("/joinchannel", chaincodeRouter.JoinChannel)

	//get table values about all chaincodess
	// router.GET("/chaincode/checkupdates", chaincodeRouter.CheckUpdates)

	// @@@@@@@@@@@@@@@@user apis

	/// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ USER APIS @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

	// ########################### CHAINCODE
	router.POST("/chaincode/install", clientRouter.ChaincodeInstall)
	//route for check commitness
	router.POST("/chaincode/commit-readiness", clientRouter.CommitReadiness)

	router.POST("/chaincode/commit", clientRouter.CommitChaincode)
	router.GET("/chaincode/list", clientRouter.ChaincodeList)

	//show installed chaincode on user dashboard
	router.GET("/user/chaincode/:OrgId", clientRouter.InstalledChaincode)

	//get route to get chaincode info by id
	router.GET("/chaincode/checkupdates/:id", clientRouter.ChaincodeUpdateCheck)

	//api to download and install update of chaincode
	router.POST("/chaincode/installupdate", clientRouter.InstallUpdate)

	// ############################### ORGANIZATION

	router.POST("/signorganization", clientRouter.SignOrganization)

	// post route to add chaincode info into table
	// router.POST("/chaincode/checkforupdates", chaincodeRouter.PostChaincodes)

	// @@@@@@@@@@@@@@@@@@@@@@@ Admin apis

	//api for chaincode update availability for admin
	// router.POST("/chaincode/checkupdates", chaincodeRouter.ChaincodeUpdates)

	// /@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ ADMIN APIS @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

	// #############################CHAINCODE

	router.POST("/chaincode/createupdates", adminRouter.CreateUpdates)

	// ############################## ORGANIZATIONS
	//add organization post'
	router.POST("/organization", adminRouter.AddOrganizations)

	router.GET("/organization", adminRouter.ListOrganizations)

	//create update package by admin
	// router.POST("/chaincode/createupdates/:id", chaincodeRouter.CreateUpdate)

	// router.POST("/chaincode/upgrade", chaincodeRouter.UpgradeChaincode)

	router.Run("localhost:4000")

	// sdk.Close()

}

// response := Response{
// 	Status:  0,
// 	Message: "chaincodes not found",
// 	// Data:    nil,
// 	Err: err,
// }
// return nil,response

// response := Response{
// Status:  1,
// Message: "chaincodes found successfully",
// // Data:    chaincode_updates,
// Err: nil,
// }

// route.GET("/subjects/:id", func(c *gin.Context) {

// 	id := c.Param("id")
// 	subjects := subjects[id]

// 	c.JSON(http.StatusOK, gin.H{
// 		"StudentID": id,
// 		"Subject":  subjects,
// 	})
// })

//TBD - Create Seperate
/*

Create methods/routes

1. POST /chaincode/install - to install the chaincode
payload {
	ccId: "string",
	version : "string",
	packageId: "string"
}

This should install and approve the chaincode.

Create struct of above requets and pass this data to install method

2. POST /chaincode/commit-readiness

payload {
	ccId: "string",
	version : "string",
	packageId: "string"
}

return response

3. POST /chaincode/commit

payload {
	ccId: "string",
	version : "string",
	packageId: "string"
}




*/
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
