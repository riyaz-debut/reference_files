const fs = require('fs');
const yaml = require('js-yaml');

const data = {
  Organizations: [
    {
      Name: 'orderer12org',
      ID: 'orderer12msp',
      MSPDir: '/home/riyaz/Documents/network1/orderer12org-root-ca/msp',
      Policies: {
        Readers: {
          Type: 'Signature',
          Rule: "OR('orderer12msp.member')",
        },
        Writers: {
          Type: 'Signature',
          Rule: "OR('orderer12msp.member')",
        },
        Admins: {
          Type: 'Signature',
          Rule: "OR('orderer12msp.admin')",
        },
      },
      OrdererEndpoints: [
        'orderer0-orderer12org:32051',
        'orderer1-orderer12org:32052',
        'orderer2-orderer12org:32053',
        'orderer3-orderer12org:32054',
        'orderer4-orderer12org:32055',
      ],
    },
    {
      Name: 'org6msp',
      ID: 'org6msp',
      MSPDir: '/home/riyaz/Documents/network1/org6-root-ca/msp',
      Policies: {
        Readers: {
          Type: 'Signature',
          Rule: "OR('org6msp.admin', 'org6msp.peer', 'org6msp.client')",
        },
        Writers: {
          Type: 'Signature',
          Rule: "OR('org6msp.admin', 'org6msp.client')",
        },
        Admins: {
          Type: 'Signature',
          Rule: "OR('org6msp.admin')",
        },
        Endorsement: {
          Type: 'Signature',
          Rule: "OR('org6msp.peer')",
        },
      },
      AnchorPeers: [
        {
          Host: 'peer0-org6',
          Port: 31033,
        },
      ],
    },
  ],
  Capabilities: {
    Channel: {
      V2_0: true,
    },
    Orderer: {
      V2_0: true,
    },
    Application: {
      V2_0: true,
    },
  },
  Application: {
    Organizations: null,
    Policies: {
      Readers: {
        Type: 'ImplicitMeta',
        Rule: 'ANY Readers',
      },
      Writers: {
        Type: 'ImplicitMeta',
        Rule: 'ANY Writers',
      },
      Admins: {
        Type: 'ImplicitMeta',
        Rule: 'MAJORITY Admins',
      },
      LifecycleEndorsement: {
        Type: 'ImplicitMeta',
        Rule: 'MAJORITY Endorsement',
      },
      Endorsement: {
        Type: 'ImplicitMeta',
        Rule: 'MAJORITY Endorsement',
      },
    },
    Capabilities: {
      ...ApplicationCapabilities,
    },
  },
  Orderer: {
    OrdererType: 'etcdraft',
    Addresses: [
      'orderer0-orderer12org:32051',
      'orderer1-orderer12org:32052',
      'orderer2-orderer12org:32053',
      'orderer3-orderer12org:32054',
      'orderer4-orderer12org:32055',
    ],
    EtcdRaft: {
      Consenters: [
        {
          Host: 'orderer0-orderer12org
