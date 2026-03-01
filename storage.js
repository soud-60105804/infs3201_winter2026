const dns = require('dns')
dns.setServers(['1.1.1.1', '1.0.0.1'])

const { MongoClient } = require('mongodb')
require('dotenv').config()

let client = null
let db = null

/**
 * Returns a connected MongoDB database instance (cached).
 *
 * @returns {Promise<import('mongodb').Db>} MongoDB database instance.
 */
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

/**
 * Gets all employees sorted by employeeId.
 *
 * @returns {Promise<Object[]>} Employees array.
 */
async function getAllEmployees() {
    const database = await getDb()
    return await database.collection('employees')
        .find({})
        .sort({ employeeId: 1 })
        .toArray()
}

/**
 * Finds a single employee by employeeId (case-insensitive).
 *
 * @param {string} employeeId Employee ID.
 * @returns {Promise<Object|null>} Employee object or null.
 */
async function findEmployeeById(employeeId) {
    const database = await getDb()
    const id = String(employeeId).trim().toUpperCase()
    return await database.collection('employees').findOne({ employeeId: id })
}

/**
 * Inserts a new employee document.
 *
 * @param {{employeeId:string,name:string,phone:string}} employee Employee document.
 * @returns {Promise<void>} No return value.
 */
async function insertEmployee(employee) {
    const database = await getDb()
    const doc = {
        employeeId: String(employee.employeeId).trim().toUpperCase(),
        name: String(employee.name),
        phone: String(employee.phone)
    }
    await database.collection('employees').insertOne(doc)
}

/**
 * Updates an employee's name and phone in MongoDB.
 *
 * @param {string} employeeId Employee ID.
 * @param {string} name New name.
 * @param {string} phone New phone.
 * @returns {Promise<void>} No return value.
 */
async function updateEmployeeDetails(employeeId, name, phone) {
    const database = await getDb()
    const id = String(employeeId).trim().toUpperCase()

    await database.collection('employees').updateOne(
        { employeeId: id },
        { $set: { name: String(name), phone: String(phone) } }
    )
}

/**
 * Finds a shift by shiftId.
 *
 * @param {string} shiftId Shift ID.
 * @returns {Promise<Object|null>} Shift object or null.
 */
async function findShiftById(shiftId) {
    const database = await getDb()
    const id = String(shiftId).trim().toUpperCase()
    return await database.collection('shifts').findOne({ shiftId: id })
}

/**
 * Finds all assignments for a given employeeId.
 *
 * @param {string} employeeId Employee ID.
 * @returns {Promise<Object[]>} Assignment documents array.
 */
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