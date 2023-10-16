package channelController

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-sdk-go/pkg/client/channel"
	configImpl "github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/fabsdk"
)

func CreateNewChannel() {
	// Load the SDK configuration file

	configProvider := configImpl.FromFile("/home/riyaz/Documents/blocker/channel-blocker/connection-org3.yaml")

	// Create the SDK instance
	sdk, err := fabsdk.New(configProvider)
	if err != nil {
		fmt.Println("Failed to create SDK instance:", err)
		os.Exit(1)
	}

	// Create the channel client context
	orgName := "org4"
	orgAdminUser := "rootcaadmin"
	orgMspId := "org4msp"
	clientContext := sdk.ChannelContext("fabdepchannel", channel.WithUser(orgAdminUser), channel.WithOrg(orgName), channel.WithMspID(orgMspId))

	// Create the channel client
	channelClient, err := channel.New(clientContext)
	if err != nil {
		fmt.Println("Failed to create channel client:", err)
		os.Exit(1)
	}

	// Create the channel request
	channelTxPath := "./chConfig/channel.tx"
	ordererName := "orderer0-orderer8org"
	channelReq := channel.Request{
		Name: "fabdepchannel",
		Config: channel.ChannelCfg{
			ChannelID: "fabdepchannel",
			Orderers:  []string{ordererName},
			Consortiums: map[string]*channel.Consortium{
				"SampleConsortium": {
					Organizations: []*channel.Organization{
						{
							Name: "org4",
							ID:   orgMspId,
							MSP:  orgMspId,
							AnchorPeers: []*channel.AnchorPeer{
								{
									Host: "peer0-org4",
									Port: 31027,
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
