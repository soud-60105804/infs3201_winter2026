const dns = require('dns')
dns.setServers(['1.1.1.1', '1.0.0.1'])

const { MongoClient } = require('mongodb')
require('dotenv').config()

let client = null
let db = null

async function getDb() {
    if (db !== null) return db

    const uri = process.env.MONGODB_URI
    const dbName = process.env.DB_NAME || 'infs3201_winter2026'

    if (!uri) {
        throw new Error('MONGODB_URI is missing in .env')
    }

    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
    await client.connect()
    db = client.db(dbName)
    return db
}

// ---------------- Employees ----------------

async function getAllEmployees() {
    const database = await getDb()
    return await database.collection('employees')
        .find({})
        .sort({ employeeId: 1 })
        .toArray()
}

async function findEmployeeById(employeeId) {
    const database = await getDb()
    const id = String(employeeId).trim().toUpperCase()
    return await database.collection('employees').findOne({ employeeId: id })
}

async function insertEmployee(employee) {
    const database = await getDb()
    const doc = {
        employeeId: String(employee.employeeId).trim().toUpperCase(),
        name: String(employee.name),
        phone: String(employee.phone)
    }
    await database.collection('employees').insertOne(doc)
}

async function updateEmployeeDetails(employeeId, name, phone) {
    const database = await getDb()
    const id = String(employeeId).trim().toUpperCase()

    await database.collection('employees').updateOne(
        { employeeId: id },
        { $set: { name: String(name), phone: String(phone) } }
    )
}

// ---------------- Shifts ----------------

async function findShiftById(shiftId) {
    const database = await getDb()
    const id = String(shiftId).trim().toUpperCase()
    return await database.collection('shifts').findOne({ shiftId: id })
}

// ---------------- Assignments (READ) ----------------

async function findAssignmentsByEmployeeId(employeeId) {
    const database = await getDb()
    const id = String(employeeId).trim().toUpperCase()
    return await database.collection('assignments').find({ employeeId: id }).toArray()
}

module.exports = {
    getAllEmployees,
    findEmployeeById,
    insertEmployee,
    updateEmployeeDetails,

    findShiftById,
    findAssignmentsByEmployeeId
}