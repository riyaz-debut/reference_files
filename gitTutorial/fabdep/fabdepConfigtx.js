
const orderOrgName = firstOrderer.orgId.name
Organizations: [
    ${orderOrgName},
        {
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
        }
    '&org6': getOrganisationsWithoutAnchor(
        ordererDetail.organisations
    )
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