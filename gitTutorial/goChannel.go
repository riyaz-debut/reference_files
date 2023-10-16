package main

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-sdk-go/pkg/client/channel"
	"github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/fabsdk"
)

func main() {
	// Load the SDK configuration file
	cfgPath := "/path/to/config.yaml"
	configProvider := config.FromFile(cfgPath)

	// Create the SDK instance
	sdk, err := fabsdk.New(configProvider)
	if err != nil {
		fmt.Println("Failed to create SDK instance:", err)
		os.Exit(1)
	}

	// Create the channel client context
	orgName := "org1"
	orgAdminUser := "Admin"
	orgMspId := "Org1MSP"
	clientContext := sdk.ChannelContext("mychannel", channel.WithUser(orgAdminUser), channel.WithOrg(orgName), channel.WithMspID(orgMspId))

	// Create the channel client
	channelClient, err := channel.New(clientContext)
	if err != nil {
		fmt.Println("Failed to create channel client:", err)
		os.Exit(1)
	}

	// Create the channel request
	channelTxPath := "/path/to/channel.tx"
	ordererName := "orderer.example.com"
	channelReq := channel.Request{
		Name: "mychannel",
		Config: channel.ChannelCfg{
			ChannelID: "mychannel",
			Orderers:  []string{ordererName},
			Consortiums: map[string]*channel.Consortium{
				"SampleConsortium": {
					Organizations: []*channel.Organization{
						{
							Name: "org1",
							ID:   orgMspId,
							MSP:  orgMspId,
							AnchorPeers: []*channel.AnchorPeer{
								{
									Host: "peer0.org1.example.com",
									Port: 7051,
								},
							},
						},
					},
				},
			},
			Capabilities: map[string]bool{
				"V2_0": true,
			},
		},
		TxFile: channelTxPath,
	}

	// Create the channel on the network
	_, err = channelClient.CreateChannel(channelReq)
	if err != nil {
		fmt.Println("Failed to create channel:", err)
		os.Exit(1)
	}

	// Close the SDK instance
	sdk.Close()
}
