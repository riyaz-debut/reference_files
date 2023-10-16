
'use strict';
const config = require('../../config');
let shell = require('shelljs');
const os = require('os');

const exceptions = require('../errors/errors');
const utils = require('../../utils/utils.js');

// Returns the configtx with the MultiNodeEtcdRaft profile for the ordering service
function getOrganisations(organisations) {
    let organisationList = [];
    for (let i = 0; i < organisations.length; i++) {
        let orgData = organisations[i];
        console.log(orgData);
        const basePath = utils.getBasePath(
            orgData.network.namespace,
            orgData.name,
            orgData.ca.name
        );

        let org = {
            Name: orgData.mspId,
            ID: orgData.mspId,
            // MSPDir: `${os.homedir}/${config.home}/${orgData.network.namespace}/${orgData.name}-${orgData.ca.name}/msp`,
            MSPDir: `${basePath}/msp`,
            Policies: {
                Readers: {
                    Type: 'Signature',
                    Rule: `OR("${orgData.mspId}.admin", "${orgData.mspId}.peer", "${orgData.mspId}.client")`,
                },
                Writers: {
                    Type: 'Signature',
                    Rule: `OR("${orgData.mspId}.admin", "${orgData.mspId}.client")`,
                },
                Admins: {
                    Type: 'Signature',
                    Rule: `OR("${orgData.mspId}.admin")`,
                },
            },
            AnchorPeers: [
                {
                    Host: orgData.peer.peer_enroll_id,
                    Port: orgData.peer.peerport,
                },
            ],
        };
        organisationList.push(org);
    }
    return organisationList;
}

function getOrganisationsWithoutAnchor(organisations) {
    
    let organisationList = [];
    for (let i = 0; i < organisations.length; i++) {
        let orgData = organisations[i];
        console.log(orgData);
        const basePath = utils.getBasePath(
            orgData.network.namespace,
            orgData.name,
            orgData.ca.name
        );
        // console.log("In getOrganisationsWithoutAnchor  orgData data :", orgData)
        console.log("peerOrgName :", orgData.peer.peer_enroll_id)
        const orgName = orgData.name
        console.log("orgName data in raft file :", orgName)
        // let organisationList = [];
        let org = [
            `${orgName}`, {
                Name: orgData.mspId,
                ID: orgData.mspId,
                // MSPDir: `${os.homedir}/${config.home}/${orgData.network.namespace}/${orgData.name}-${orgData.ca.name}/msp`,
                MSPDir: `${basePath}/msp`,
                Policies: {
                    Readers: {
                        Type: 'Signature',
                        Rule: `OR("${orgData.mspId}.admin", "${orgData.mspId}.peer", "${orgData.mspId}.client")`,
                    },
                    Writers: {
                        Type: 'Signature',
                        Rule: `OR("${orgData.mspId}.admin", "${orgData.mspId}.client")`,
                    },
                    Admins: {
                        Type: 'Signature',
                        Rule: `OR("${orgData.mspId}.admin")`,
                    },
                    Endorsement: {
                        Type: 'Signature',
                        Rule: `OR("${orgData.mspId}.peer")`,
                    }
                }
            }
        ]
        console.log("org data :", org)
        organisationList.push(org);
        console.log("organisationList data :", organisationList)
    }
    return organisationList;
}

function getGenesisRaftTx(orderingList, ordererDetail) {
	let consenterArray = Array();
	let addresses = Array();
	let firstOrderer;
	//Generates the consentor array and address array for the MultiNodeEtcdRaft profile

	for (let i = 0; i < orderingList.length; i++) {
		let orderer = orderingList[i];
		// const basePath = `${os.homedir}/${config.home}/${orderer.networkId.namespace}/${orderer.orgId.name}-${orderer.caId.name}`;
        const basePath = utils.getBasePath(
            orderer.networkId.namespace,
            orderer.orgId.name,
            orderer.caId.name
        );
		let concentorObj = {
			Host: orderer.name,
			Port: orderer.port,
			ClientTLSCert: `${basePath}/${orderer.name}/crypto/tls/server.crt`,
			ServerTLSCert: `${basePath}/${orderer.name}/crypto/tls/server.crt`,
		};
		addresses.push(`${orderer.name}:${orderer.port}`);
		consenterArray.push(concentorObj);
		if (i === 0) {
			firstOrderer = orderer;
		}
	}

	// const firstOrdererbasePath = `${os.homedir}/${config.home}/${firstOrderer.networkId.namespace}/${firstOrderer.orgId.name}-${firstOrderer.caId.name}`;
    const firstOrdererbasePath = utils.getBasePath(
        firstOrderer.networkId.namespace,
        firstOrderer.orgId.name,
        firstOrderer.caId.name
    );
    console.log("firstOrdererbasePath in get genesisRaftTx:", firstOrdererbasePath)
    console.log("ordererDetail.organisations data in raft file :", ordererDetail.organisations)
    let ordererOrgName = Array();
    ordererOrgName.push(firstOrderer.orgId.name)
    console.log("ordererOrgName data in raft file :", ordererOrgName)
    let fxData = getOrganisationsWithoutAnchor(ordererDetail.organisations)
    console.log("fxData :", fxData)
	return {
		Organizations: [
			`${ordererOrgName}`, {
                Name: firstOrderer.orgId.name,
                ID: firstOrderer.orgId.mspId,
                MSPDir: `${firstOrdererbasePath}/msp`,
                Policies: {
                    Readers: {
                        Type: "Signature",
                        Rule: `OR('${firstOrderer.orgId.mspId}.member')`,
                    },
                    Writers: {
                        Type: "Signature",
                        Rule: `OR('${firstOrderer.orgId.mspId}.member')`,
                    },
                    Admins: {
                        Type: "Signature",
                        Rule: `OR('${firstOrderer.orgId.mspId}.admin')`,
                    }
                },
                OrdererEndpoints: addresses
            },
            getOrganisationsWithoutAnchor(ordererDetail.organisations)
        ],        
        Capabilities: {
            Channel: {
              '&ChannelCapabilities': {
                [config.fabricVersion.configVersion]: true
              }
            },
            Orderer: {
              '&OrdererCapabilities': {
                [config.fabricVersion.configVersion]: true
              }
            },
            Application: {
              '&ApplicationCapabilities': {
                [config.fabricVersion.configVersion]: true
              }
            }
        },
        Application: {
            '&ApplicationDefaults': {
                Organizations: [],
                Policies: {
                    Readers: {
                    Type: 'ImplicitMeta',
                    Rule: 'ANY Readers'
                    },
                    Writers: {
                    Type: 'ImplicitMeta',
                    Rule: 'ANY Writers'
                    },
                    Admins: {
                    Type: 'ImplicitMeta',
                    Rule: 'MAJORITY Admins'
                    },
                    LifecycleEndorsement: {
                    Type: 'ImplicitMeta',
                    Rule: 'MAJORITY Endorsement'
                    },
                    Endorsement: {
                    Type: 'ImplicitMeta',
                    Rule: 'MAJORITY Endorsement'
                    }
                },
                Capabilities: {
                    '<<': '*ApplicationCapabilities'
                }
            }
        },
        Orderer: {
            '&OrdererDefaults': {
                OrdererType: 'etcdraft',
                Addresses: addresses,
                EtcdRaft: {
                    Consenters: consenterArray,
                },
                BatchTimeout: "2s",
                BatchSize: {
                    MaxMessageCount: 10,
                    AbsoluteMaxBytes: "99 MB",
                    PreferredMaxBytes: "512 KB"
                },
                Organizations:{},
                Policies: {
                    Readers: {
                    Type: 'ImplicitMeta',
                    Rule: 'ANY Readers'
                    },
                    Writers: {
                    Type: 'ImplicitMeta',
                    Rule: 'ANY Writers'
                    },
                    Admins: {
                    Type: 'ImplicitMeta',
                    Rule: 'MAJORITY Admins'
                    },
                    BlockValidation: {
                    Type: 'ImplicitMeta',
                    Rule: "ANY Writers"
                    }
                }
            }
        },
        Channel: {
            '&ChannelDefaults': {
                Policies: {
                    Readers: {
                    Type: 'ImplicitMeta',
                    Rule: 'ANY Readers'
                    },
                    Writers: {
                    Type: 'ImplicitMeta',
                    Rule: 'ANY Writers'
                    },
                    Admins: {
                    Type: 'ImplicitMeta',
                    Rule: 'MAJORITY Admins'
                    }
                },
                Capabilities: {
                    '<<': '*ChannelCapabilities'
                }
            }
        },
        Profiles: {
            SampleOrdererGenesis: {
                '<<': '*ChannelDefaults',
                Orderer: {
                    '<<': '*OrdererDefaults',
                    Organizations: [
                    '*OrdererOrg'
                    ],
                    Capabilities: {
                    '<<': '*OrdererCapabilities'
                    }
                },
                Consortiums: {
                    SampleConsortium: {
                    Organizations: [
                        '*org6'
                        ]
                    }
                }
            },
            OrgsChannel: {
                Consortium: 'SampleConsortium',
                '<<': '*ChannelDefaults',
                Application: {
                    '<<': '*ApplicationDefaults',
                    Organizations: [
                    '*org6'
                    ],
                    Capabilities: {
                    '<<': '*ApplicationCapabilities'
                    }
                }
            }
        }
    };
}

// Returns the configtx with the Solo profile for the ordering service

function getGenesisSoloTx(orderer, ordererDetail) {
    const basePath = `${os.homedir}/${config.home}/${orderer.networkId.namespace}/${orderer.orgId.name}-${orderer.caId.name}`;
    console.log('************************' + basePath);
    const mspId = orderer.orgId.mspId;
    const orgName = orderer.orgId.name;
    return {
        Profiles: {
            Solo: {
                Policies: {
                    Readers: {
                        Type: 'ImplicitMeta',
                        Rule: 'ANY Readers'
                    },
                    Writers: {
                        Type: 'ImplicitMeta',
                        Rule: 'ANY Writers'
                    },
                    Admins: {
                        Type: 'ImplicitMeta',
                        Rule: 'MAJORITY Admins'
                    }
                },
                Capabilities: {
                    [config.fabricVersion.configVersion]: true
                },
                Orderer: {
                    OrdererType: 'solo',
                    Addresses: [
                        `${orderer.name}:${orderer.port}`
                    ],
                    BatchTimeout: '2s',
                    BatchSize: {
                        MaxMessageCount: 10,
                        AbsoluteMaxBytes: '99 MB',
                        PreferredMaxBytes: '512 KB'
                    },
                    Kafka: {
                        Brokers: [
                            '127.0.0.1:9092'
                        ]
                    },
                    Organizations: [
                        {
                            Name: orgName,
                            ID: mspId,
                            MSPDir: `${basePath}/msp`,
                            Policies: {
                                Readers: {
                                    Type: 'Signature',
                                    Rule: `OR('${mspId}.member')`
                                },
                                Writers: {
                                    Type: 'Signature',
                                    Rule: `OR('${mspId}.member')`
                                },
                                Admins: {
                                    Type: 'Signature',
                                    Rule: `OR('${mspId}.admin')`
                                }
                            }
                        }
                    ],
                    Policies: {
                        Readers: {
                            Type: 'ImplicitMeta',
                            Rule: 'ANY Readers'
                        },
                        Writers: {
                            Type: 'ImplicitMeta',
                            Rule: 'ANY Writers'
                        },
                        Admins: {
                            Type: 'ImplicitMeta',
                            Rule: 'MAJORITY Admins'
                        },
                        BlockValidation: {
                            Type: 'ImplicitMeta',
                            Rule: 'ANY Writers'
                        }
                    },
                    Capabilities: {
                        [config.fabricVersion.configVersion]: true
                    }
                },
                Consortiums: {
                    SampleConsortium: {
                        Organizations: getOrganisationsWithoutAnchor(ordererDetail.organisations)
                    }
                }
            }
        }
    };
}

function getAdminRules(organisations) {
    let rules = 'AND(';
    for (let i = 0; i < organisations.length; i++) {
        let org = organisations[i];
        let lastElement = (organisations.length - 1);
        if (organisations.length === 1) {
            rules += `"${org.mspId}.admin")`;
        }
        else if (i === 0) {
            rules += `"${org.mspId}.admin",`;
        }
        else if (lastElement === i) {
            rules += ` "${org.mspId}.admin")`;
        }

        else {
            rules += ` "${org.mspId}.admin",`;
        }
    }
    return rules;

}




// return confitx profile for the channel
function getChannelTx(data) {

    return {
        Profiles: {
            OrgsChannel: {
                Consortium: 'SampleConsortium',
                Policies: {
                    Readers: {
                        Type: 'ImplicitMeta',
                        Rule: 'ANY Readers'
                    },
                    Writers: {
                        Type: 'ImplicitMeta',
                        Rule: 'ANY Writers'
                    },
                    Admins: {
                        Type: 'Signature',
                        Rule: getAdminRules(data.organisations)
                    }
                },
                Capabilities: {
                    [config.fabricVersion.configVersion]: true
                    // V1_3: false,
                    // V1_1: false

                },
                Application: {
                    Organizations: getOrganisations(data.organisations),
                    Policies: {
                        Readers: {
                            Type: 'ImplicitMeta',
                            Rule: 'ANY Readers'
                        },
                        Writers: {
                            Type: 'ImplicitMeta',
                            Rule: 'ANY Writers'
                        },
                        Admins: {
                            Type: 'Signature',
                            Rule: getAdminRules(data.organisations)
                        }
                    },
                    Capabilities: {
                        [config.fabricVersion.configVersion]: true
                        // V1_3: false,
                        // V1_2: false,
                        // V1_1: false
                    }
                }
            }
        }
    };
}



// Generates the genesis block for the ordering service
// using the shell and the configtxgen binary

function generateGenesisBlock(genesisPath, ordererType) {

    if (!shell.which('configtxgen')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');

    }
    console.log(genesisPath);
    if (ordererType === 1) {
        //Raft
        // configtxgen -profile MultiNodeEtcdRaft -channelID system-channel -outputBlock ${PWD}/../system-genesis-file/genesis.block -configPath ${PWD}/../configtx/
        if (shell.exec(`export FABRIC_CFG_PATH=${genesisPath} && configtxgen -profile MultiNodeEtcdRaft -channelID system-channel -outputBlock ${genesisPath}/genesis.block`).code !== 0) {
            shell.echo('Error: while creating genesis block');
            throw new exceptions.GenesisException('Error: while creating genesis block');
        }
    } else {
        //Solo
        if (shell.exec(`export FABRIC_CFG_PATH=${genesisPath} && configtxgen -profile Solo -channelID system-channel -outputBlock ${genesisPath}/genesis.block`).code !== 0) {
            shell.echo('Error: while creating genesis block');
            throw new exceptions.GenesisException('Error: while creating genesis block');
        }

    }
    console.log('generated');
}



// Generates the channelTx for the Channel
// using the shell and the configtxgen binary

function generateOrgConfig(ConfigtxPath) {

    if (!shell.which('configtxgen')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');

    }
    if (shell.exec(`export FABRIC_CFG_PATH=${ConfigtxPath}/org1new-artifacts   && configtxgen -printOrg Org1MSP > ${ConfigtxPath}/org1new-artifacts/org1.json`).code !== 0) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException('Error: while creating Channel Tx');
    }
    console.log('generated');
}


module.exports = {
    getGenesisRaftTx,
    getGenesisSoloTx,
    generateGenesisBlock,
    generateOrgConfig,
    getChannelTx
};