'use strict';

const { Contract} = require('fabric-contract-api');


class StudentContract extends Contract {

    // get stuent details stored in the blockchain network with given id.
    async GetSingleStudent(ctx, data) {
        console.log("Data is", data);

        data = JSON.parse(data);
        console.log("Data after parsing is", data);

        const studentJSON = await ctx.stub.getState(data.id);
        console.log("Student json is: ", studentJSON)
        
        if (!studentJSON || studentJSON.length === 0) {
            return [];
        }
        return studentJSON.toString();
    }

    // AddNewStudent issues a new student to the world state with given details.
    async AddNewStudent(ctx, data) {

        console.log("Data is: ", data)
        data = JSON.parse(data);
        console.log("Data after parsing is", data);

        const exists = await this.StudentExists(ctx, data.id);
        if (exists) {
            throw new Error(`The student ${data.id} already exists`);
        }

        let student = {
            ID: data.id,
            firstName:data.firstName,
            lastName:data.lastName,
            email:data.email,
            mobile_no:data.mobile_no,
            address:data.address,
            city:data.city,
        };

        console.log("student is: ", student)

        await ctx.stub.putState(data.id, Buffer.from(JSON.stringify(student)));
        return JSON.stringify(student);
    }

    // UpdateStudent updates an existing Student on the blockchain network with provided parameters.
    async UpdateStudentInfo(ctx, data) {

        console.log("data is: ", data)

        data = JSON.parse(data);
        console.log("Data after parsing is", data);

        const exists = await this.StudentExists(ctx, data.id);
        if (!exists) {
            throw new Error(`The student with id ${data.id} does not exist`);
        }

        // overwriting original Student with new details
        const updatedStudent = {
            ID: data.id,
            firstName:data.firstName,
            lastName:data.lastName,
            email:data.email,
            mobile_no:data.mobile_no,
            address:data.address,
            city:data.city,
        };
        await ctx.stub.putState(data.id, Buffer.from(JSON.stringify(updatedStudent)));
        return JSON.stringify(updatedStudent);
    }

    // StudentExists returns true when Student with given ID exists in blockchain network.
    async StudentExists(ctx, id) {
        console.log("data is: ", id)

        const studentJSON = await ctx.stub.getState(id);
        return studentJSON && studentJSON.length > 0;
    }

    // GetAllStudent returns all assets found in the world state.
    async GetAllStudents(ctx) {
        const allStudents = [];
        console.log("allStudents is", allStudents);

        // range query with empty string for all assets in the chaincode.
        const iterator = await ctx.stub.getStateByRange('', '');
        console.log("Iterator is", iterator);

        let result = await iterator.next();
        console.log("result is", result);
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allStudents);
    }
}

module.exports = StudentContract;

