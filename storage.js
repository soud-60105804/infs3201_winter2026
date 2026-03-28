const dns = require('dns')
dns.setServers(['1.1.1.1', '1.0.0.1'])

const mongodb = require('mongodb')
const { MongoClient } = mongodb
require('dotenv').config()

let client = null
let db = null

/**
 * Returns a connected MongoDB database instance.
 *
 * @returns {Promise<import('mongodb').Db>} MongoDB database instance.
 */
async function getDb() {
    if (db !== null) {
        return db
    }

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

/**
 * Converts a string into a MongoDB ObjectId.
 *
 * @param {string} id Id string.
 * @returns {import('mongodb').ObjectId|null} ObjectId or null if invalid.
 */
function makeObjectId(id) {
    const cleanId = String(id).trim()

    if (mongodb.ObjectId.isValid(cleanId) === false) {
        return null
    }

    return new mongodb.ObjectId(cleanId)
}

/**
 * Gets all employees sorted by name.
 *
 * @returns {Promise<Object[]>} Employees array.
 */
async function getAllEmployees() {
    const database = await getDb()

    return await database.collection('employees')
        .find({})
        .sort({ name: 1 })
        .toArray()
}

/**
 * Finds a single employee by MongoDB _id.
 *
 * @param {string} id Employee _id string.
 * @returns {Promise<Object|null>} Employee document or null.
 */
async function findEmployeeById(id) {
    const database = await getDb()
    const objectId = makeObjectId(id)

    if (objectId === null) {
        return null
    }

    return await database.collection('employees').findOne({ _id: objectId })
}

/**
 * Inserts a new employee document.
 *
 * @param {{name:string,phone:string}} employee Employee document.
 * @returns {Promise<import('mongodb').InsertOneResult>} Insert result.
 */
async function insertEmployee(employee) {
    const database = await getDb()

    const doc = {
        name: String(employee.name).trim(),
        phone: String(employee.phone).trim()
    }

    return await database.collection('employees').insertOne(doc)
}

/**
 * Updates an employee's name and phone using MongoDB _id.
 *
 * @param {string} id Employee _id string.
 * @param {string} name New name.
 * @param {string} phone New phone.
 * @returns {Promise<void>} No return value.
 */
async function updateEmployeeDetails(id, name, phone) {
    const database = await getDb()
    const objectId = makeObjectId(id)

    if (objectId === null) {
        return
    }

    await database.collection('employees').updateOne(
        { _id: objectId },
        { $set: { name: String(name).trim(), phone: String(phone).trim() } }
    )
}

/**
 * Finds all shifts containing a given employee ObjectId.
 *
 * @param {string} id Employee _id string.
 * @returns {Promise<Object[]>} Shift documents.
 */
async function findShiftsByEmployeeId(id) {
    const database = await getDb()
    const objectId = makeObjectId(id)

    if (objectId === null) {
        return []
    }

    return await database.collection('shifts')
        .find({ employees: objectId })
        .sort({ date: 1, startTime: 1 })
        .toArray()
}

module.exports = {
    getAllEmployees,
    findEmployeeById,
    insertEmployee,
    updateEmployeeDetails,
    findShiftsByEmployeeId
}