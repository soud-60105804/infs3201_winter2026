const dns = require('dns')
dns.setServers(['1.1.1.1', '1.0.0.1'])

const fs = require('fs/promises')
const { MongoClient } = require('mongodb')
require('dotenv').config()

/**
 * Reads a JSON file and returns an array.
 *
 * @param {string} path File path.
 * @returns {Promise<Object[]>} Array from the file, or [] if invalid.
 */
async function readJsonArray(path) {
    const raw = await fs.readFile(path, 'utf-8')
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
}

/**
 * Seeds MongoDB collections (employees, shifts, assignments) from JSON files.
 *
 * @returns {Promise<void>} No return value.
 */
async function main() {
    const uri = process.env.MONGODB_URI
    const dbName = process.env.DB_NAME || 'infs3201_winter2026'

    if (!uri) {
        console.log('ERROR: MONGODB_URI is missing in .env')
        return
    }

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
    await client.connect()
    const db = client.db(dbName)

    const employees = await readJsonArray('employees.json')
    const shifts = await readJsonArray('shifts.json')
    const assignments = await readJsonArray('assignments.json')

    for (let i = 0; i < employees.length; i++) {
        employees[i].employeeId = String(employees[i].employeeId).trim().toUpperCase()
    }
    for (let i = 0; i < shifts.length; i++) {
        shifts[i].shiftId = String(shifts[i].shiftId).trim().toUpperCase()
    }
    for (let i = 0; i < assignments.length; i++) {
        assignments[i].employeeId = String(assignments[i].employeeId).trim().toUpperCase()
        assignments[i].shiftId = String(assignments[i].shiftId).trim().toUpperCase()
    }

    await db.collection('employees').deleteMany({})
    await db.collection('shifts').deleteMany({})
    await db.collection('assignments').deleteMany({})

    if (employees.length > 0) await db.collection('employees').insertMany(employees)
    if (shifts.length > 0) await db.collection('shifts').insertMany(shifts)
    if (assignments.length > 0) await db.collection('assignments').insertMany(assignments)

    await db.collection('employees').createIndex({ employeeId: 1 }, { unique: true })
    await db.collection('shifts').createIndex({ shiftId: 1 }, { unique: true })
    await db.collection('assignments').createIndex({ employeeId: 1, shiftId: 1 }, { unique: true })

    await client.close()
    console.log('Seed complete (MongoDB)')
}

main().catch(err => console.log(err.message))