const dns = require('dns')
dns.setServers(['1.1.1.1', '1.0.0.1'])

const { MongoClient } = require('mongodb')
require('dotenv').config()

let client = null
let db = null

/**
 * Returns a connected MongoDB database instance.
 *
 * @returns {Promise<import('mongodb').Db>} MongoDB database.
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
 * Adds an empty employees array to every shift document.
 *
 * @returns {Promise<void>} No return value.
 */
async function createEmptyEmployeesArray() {
    const database = await getDb()

    await database.collection('shifts').updateMany(
        {},
        { $set: { employees: [] } }
    )

    console.log('Step 1 complete: empty employees array added to all shifts')
}

/**
 * Embeds employee ObjectIds into shift documents using old assignments.
 *
 * @returns {Promise<void>} No return value.
 */
async function embedEmployeesInShifts() {
    const database = await getDb()
    const assignments = await database.collection('assignments').find({}).toArray()

    for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i]

        const employeeCode = String(assignment.employeeId).trim().toUpperCase()
        const shiftCode = String(assignment.shiftId).trim().toUpperCase()

        const employee = await database.collection('employees').findOne({ employeeId: employeeCode })
        const shift = await database.collection('shifts').findOne({ shiftId: shiftCode })

        if (employee !== null && shift !== null) {
            await database.collection('shifts').updateOne(
                { _id: shift._id },
                { $addToSet: { employees: employee._id } }
            )
        }
    }

    console.log('Step 2 complete: employee ObjectIds embedded into shifts.employees')
}

/**
 * Removes old fields and drops the assignments collection.
 *
 * @returns {Promise<void>} No return value.
 */
async function removeUnnecessaryItems() {
    const database = await getDb()

    await database.collection('employees').updateMany(
        {},
        { $unset: { employeeId: '' } }
    )

    await database.collection('shifts').updateMany(
        {},
        { $unset: { shiftId: '' } }
    )

    const collections = await database.listCollections({}, { nameOnly: true }).toArray()
    let foundAssignments = false

    for (let i = 0; i < collections.length; i++) {
        if (collections[i].name === 'assignments') {
            foundAssignments = true
            break
        }
    }

    if (foundAssignments === true) {
        await database.collection('assignments').drop()
        console.log('assignments collection dropped')
    } else {
        console.log('assignments collection not found, nothing to drop')
    }

    console.log('Step 3 complete: old fields removed')
}

/**
 * Displays one employee and one shift for manual checking.
 *
 * @returns {Promise<void>} No return value.
 */
async function showCheckData() {
    const database = await getDb()

    const oneEmployee = await database.collection('employees').findOne({})
    const oneShift = await database.collection('shifts').findOne({})

    console.log('Sample employee:')
    console.log(oneEmployee)

    console.log('Sample shift:')
    console.log(oneShift)
}

/**
 * Runs the full one-time transformation.
 *
 * @returns {Promise<void>} No return value.
 */
async function main() {
    try {
        console.log('Starting Assignment 4 database transformation')
        console.log('Make sure you backed up your database first')

        await createEmptyEmployeesArray()
        await embedEmployeesInShifts()
        await removeUnnecessaryItems()
        await showCheckData()

        console.log('Transformation complete')
    } finally {
        if (client !== null) {
            await client.close()
        }
    }
}

main().catch(function (err) {
    console.log('ERROR:', err.message)
})