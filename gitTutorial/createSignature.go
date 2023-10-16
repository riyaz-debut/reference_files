// create signature
func CreateSignature(resmgmtClient *resmgmt.Client, chConfigPath string, mspClient *msp.Client, user string,  id string) utils.Response {
	//need logged in org id from logged in details later for dynamic logged in user id
	loggedInId := orgId
	log.Println("loggedin id :", loggedInId)
	//org_Id of new org to be signed
	var org_Id int
	if i, err := strconv.Atoi(id); err == nil {
		fmt.Printf("i=%d, type: %T\n", i, i)
		org_Id = i
	} else {
		response := utils.Response{Status: 500, Message: "error converting org id to int", Err: err}
		log.Println("response", response)
		return response
	}

	///////////////////////////////////download envelope pb file and use it ////////////////
	type OrgId struct {
		OrgId int `json:"org_id"`
	}

	orgId := OrgId{OrgId: org_Id}
	log.Println("org id in starting :", orgId)

	orgData, _ := json.Marshal(orgId)
	log.Println("orgData in starting :", orgData)

	//calling api to get list of org from db
	apiResp, err := ApiCall("POST", config.ORG, orgData, userToken)
	if err != nil {
		log.Println("error in api calling ", err)
		response := utils.Response{
			Status:  500,
			Message: "error in calling api",
			Err:     err,
		}
		return response

	}

	respData, _ := ioutil.ReadAll(apiResp.Body)
	if err != nil {
		fmt.Println("Can't readAll resp body", err)
		response := utils.Response{
			Status:  500,
			Message: "error converting response data to bytes array",
			// Data: ,
			Err: err,
		}
		return response
	}

	type OrgData struct {
		Id             int    `gorm:"primaryKey;autoIncrement"`
		Name           string `json:"name"`
		MspId          string `json:"msp_id"`
		PeersCount     int    `json:"peers_count"`
		Config         string `json:"file" gorm:"type:text"`
		ModifiedConfig string `json:"modified_config" gorm:"type:text"`
		Status    	   int    `json:"status"`
		EnvelopeUrl    string `json:"envelope_url"`
		CreatedAt      string `json:"created_at"`
		UpdatedAt      string `json:"updated_at" gorm:"autoUpdateTime"`
	}

	//fetching called api response into
	type Data struct {
		Status  int           `json:"status"`
		Message string        `json:"message"`
		Data    OrgData `json:"data"`
		Err     error         `json:"err,omitempty"`
	}

	//unmarshalling resp data
	var orgList Data
	err = json.Unmarshal(respData, &orgList)
	if err != nil {
		log.Println("error unmarshalling ", err)
		response := utils.Response{Status: 500, Message: "error unmarshalling organizations data", Err: err}
		log.Println("response", response)
		return response
	}

	log.Println("org name :", orgList.Data.Name)

	fileUrl := orgList.Data.EnvelopeUrl
	log.Println("envelope url :", fileUrl)

	filename := filepath.Join("downloadFiles/"+ orgList.Data.Name+ "_" +"envelope")
	//chaincode zipfile extraction path
	forDest := "/home/riyaz/projects/integra/integra-client-backend/integra-nock-sdk/downloadFiles"
	zipExtractPath := filepath.Join(forDest)
	log.Println("zipeextractpath", zipExtractPath)
	GetZipFile(filename, fileUrl, zipExtractPath)

	log.Println("enetered unzip source 1")
	reader, err := zip.OpenReader(filename)
	if err != nil {
		log.Println("err in destination path", err)
	}

	defer reader.Close()
	log.Println("enetered unzip source 2", reader)
	// 2. Get the absolute destination path
	// getting new chaincode extracted path
	// 3. Iterate over zip files inside the archive and unzip each of them
	var newCCPath string
	for _, f := range reader.File {
		extractedCcPath, err := unzipTestFile(f, forDest)
		if err != nil {
			log.Println("err unzipping in iteration", err)
			// return err
		}
		log.Println("newPath is :", extractedCcPath)
		newCCPath = extractedCcPath
	}

	
	log.Println("newCCPath", newCCPath)

	

// create signature procedure
	usr, err := mspClient.GetSigningIdentity(user)
	if err != nil {
		log.Println("error in finidng user ", err)
		response := utils.Response{
			Status:  500,
			Message: "error in finidng user",
			Err:     err,
		}
		return response
	}
	log.Println("@@@@@@@@@@@@@@@@@@@@@@@@ 4", usr)

	chConfigReader, err := os.Open(newCCPath)
	if err != nil {
		log.Println("failed to create reader for the config  for org1 ", err)
		response := utils.Response{
			Status:  500,
			Message: "failed to create reader for the config  for org1",
			Err:     err,
		}
		return response
	}
	
	log.Println("@@@@@@@@@@@@@@@@@@@@@@@@ 5", chConfigReader)
	log.Println("@@@@@@@@@@@@@@@@@@@@@@@@")
	signature, err :=resmgmtClient.CreateConfigSignatureFromReader(usr, chConfigReader)
	if err != nil {
		log.Println("err getting signing identity ", err)
		response := utils.Response{
			Status:  500,
			Message: "err getting signing identity",
			Err:     err,
		}
		return response
	}
	log.Println("signature in create signature fx :", signature)

	//////////////////////////////////////////////////////////////

	var buffOrg bytes.Buffer
	if err := protolator.DeepMarshalJSON(&buffOrg, signature); err != nil {
		log.Println("error while deep marshaliing", err)
		response := utils.Response{Status: 500, Message: "error unmarshalling api", Err: err}
		return response
	}
	signatureString := buffOrg.String()
	log.Println("signatureString :", signatureString)

	//callng api to store signatures in db
	type SignatureData struct {
		OrgId      int    `json:"org_id"`
		SigningOrg int    `json:"signingorg_id"`
		Signatures string `json:"signatures"`
	}

	signData := SignatureData{OrgId: orgId.OrgId, SigningOrg: loggedInId, Signatures: signatureString}
	signDataByte, _ := json.Marshal(signData)

	log.Println("org to be signed id is ", orgId.OrgId)

	//calling api to fetch data from db
	newApiResp, err := ApiCall("POST", config.SAVE_ORG_SIGN, signDataByte, userToken)
	if err != nil {
		log.Println("error in api calling ", err)
		response := utils.Response{
			Status:  500,
			Message: "error in calling api",
			Err:     err,
		}
		return response

	}
	newRespData, _ := ioutil.ReadAll(newApiResp.Body)
	type OrgSignature struct {
		Id int `gorm:"primaryKey;autoIncrement"`
		// ChaincodeId int       `json:"chaincode_id"`
		OrgId     int    `json:"org_id"`
		OrgMsp    string `json:"org_msp"`
		SignbyId  int    `json:"signby_id"`
		Signature string `json:"signature" gorm:"type:text"`

		CreatedAt time.Time `json:"created_at"`
		UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	}

	fmt.Println("response Body:", string(newRespData))

	type ApiResponse struct {
		Status  int          `json:"status,omitempty"`
		Message string       `json:"message,omitempty"`
		Data    OrgSignature `json:"data,omitempty"`
		Err     error        `json:"err,omitempty"`
	}

	var apiResponse ApiResponse
	err = json.Unmarshal(newRespData, &apiResponse)
	if err != nil {
		log.Println("error unmarshalling ", err)
		response := utils.Response{Status: 500, Message: "error unmarshalling api", Err: err}
		log.Println("response", response)
		return response
	}

	orgIdString := strconv.Itoa(orgId.OrgId)
	fmt.Println(orgIdString)

	loggedInIdString := strconv.Itoa(loggedInId)
	fmt.Println(loggedInIdString)

	// add signorg details to db
	err = ioutil.WriteFile("signed_org"+"_"+orgIdString+"_"+loggedInIdString+".json", buffOrg.Bytes(), 0777)
	if err != nil {
		panic(err)
	}

	response := utils.Response{
		Status:  apiResponse.Status,
		Message: apiResponse.Message,
		Data:    apiResponse.Data,
		Err:     apiResponse.Err,
	}
	return response
}

func unzipTestFile(f *zip.File, destination string) (string, error) {
	filePath := filepath.Join(destination, f.Name)
	log.Println("filepath", filePath)

	return filePath, nil
}