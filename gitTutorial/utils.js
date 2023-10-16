'use strict';
const os = require('os');
const config = require('../config');
const writeYamlFile = require('write-yaml-file');
function writeYaml2(path, yamlData) {
    return new Promise((resolve, reject) => {
        writeYamlFile(path, yamlData).then(() => {
            console.log('writeYaml2 done');
            resolve();
        }).catch(error => {
            reject(error);
        });
    });
}
function writenodeOUSConfigYaml(path) {
    const nodeOUSObject = {
        NodeOUs: {
            Enable: true,
            ClientOUIdentifier: {
                Certificate: 'cacerts/ca.pem',
                OrganizationalUnitIdentifier: 'client'
            },
            PeerOUIdentifier: {
                Certificate: 'cacerts/ca.pem',
                OrganizationalUnitIdentifier: 'peer'
            }
        }
    };
    return new Promise((resolve, reject) => {
        writeYamlFile(path, nodeOUSObject).then(() => {
            resolve();
        }).catch(error => {
            reject(error);
        });
    });
}

function getBasePath(networkName, orgName, caName) {
    return `${os.homedir}/Documents/${networkName}/${orgName}-${caName}`;
}
function getCaBasePath(networkName, caName) {
    return `${os.homedir}/Documents/${networkName}/${caName}`;
}
function getExportedOrgBasePath(networkName, orgName) {
    return `${os.homedir}/${config.home}/${networkName}/exported-org/${orgName}`;
}
module.exports = {
    writeYaml2,
    writenodeOUSConfigYaml,
    getBasePath,
    getCaBasePath,
    getExportedOrgBasePath
};