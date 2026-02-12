const fs = require('fs/promises')

/**
 * File paths (must match your existing JSON filenames).
 * @type {string}
 */
const employeesFilePath = 'employees.json'

/**
 * File paths (must match your existing JSON filenames).
 * @type {string}
 */
const shiftsFilePath = 'shifts.json'

/**
 * File paths (must match your existing JSON filenames).
 * @type {string}
 */
const assignmentsFilePath = 'assignments.json'

/**
 * Configuration file path for Schedule Limit feature.
 * @type {string}
 */
const configFilePath = 'config.json'

/**
 * Reads a JSON file and returns an array.
 * If the file is missing, invalid JSON, or not an array => returns [].
 *
 * @param {string} filePath Path to the JSON file.
 * @returns {Promise<Object[]>} Array from file, or [] if not usable.
 */
async function readArrayFile(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(raw)

        if (!Array.isArray(data)) {
            return []
        }
        return data
    } catch (err) {
        return []
    }
}

/**
 * Writes an array of objects to a JSON file using pretty format (4 spaces).
 *
 * @param {string} filePath Path to the JSON file.
 * @param {Object[]} items Array to write.
 * @returns {Promise<void>} No return value.
 */
async function writeArrayFile(filePath, items) {
    const text = JSON.stringify(items, null, 4)
    await fs.writeFile(filePath, text, 'utf-8')
}

/**
 * Loads config.json and returns a config object.
 * If missing/invalid, returns default { maxDailyHours: 9 }.
 *
 * @returns {Promise<{maxDailyHours:number}>} Config object.
 */
async function loadConfig() {
    try {
        const raw = await fs.readFile(configFilePath, 'utf-8')
        const obj = JSON.parse(raw)

        const val = Number(obj.maxDailyHours)
        if (Number.isFinite(val) && val > 0) {
            return { maxDailyHours: val }
        }

        return { maxDailyHours: 9 }
    } catch (err) {
        return { maxDailyHours: 9 }
    }
}

/**
 * Loads and returns all employees from employees.json.
 *
 * @returns {Promise<Object[]>} Employees array.
 */
async function getAllEmployees() {
    return await readArrayFile(employeesFilePath)
}

/**
 * Finds an employee by employeeId (case-insensitive).
 *
 * @param {string} employeeId Employee ID to search for.
 * @returns {Promise<Object|null>} Employee object if found, otherwise null.
 */
async function findEmployeeById(employeeId) {
    const target = String(employeeId).trim().toUpperCase()
    const employees = await readArrayFile(employeesFilePath)

    for (let i = 0; i < employees.length; i++) {
        const e = employees[i]
        const id = String(e.employeeId).trim().toUpperCase()
        if (id === target) {
            return e
        }
    }
    return null
}

/**
 * Inserts a new employee into employees.json.
 *
 * @param {{employeeId:string,name:string,phone:string}} employee Employee object to insert.
 * @returns {Promise<void>} No return value.
 */
async function insertEmployee(employee) {
    const employees = await readArrayFile(employeesFilePath)
    employees.push(employee)
    await writeArrayFile(employeesFilePath, employees)
}

/**
 * Loads and returns all shifts from shifts.json.
 *
 * @returns {Promise<Object[]>} Shifts array.
 */
async function getAllShifts() {
    return await readArrayFile(shiftsFilePath)
}

/**
 * Finds a shift by shiftId (case-insensitive).
 *
 * @param {string} shiftId Shift ID to search for.
 * @returns {Promise<Object|null>} Shift object if found, otherwise null.
 */
async function findShiftById(shiftId) {
    const target = String(shiftId).trim().toUpperCase()
    const shifts = await readArrayFile(shiftsFilePath)

    for (let i = 0; i < shifts.length; i++) {
        const s = shifts[i]
        const id = String(s.shiftId).trim().toUpperCase()
        if (id === target) {
            return s
        }
    }
    return null
}

/**
 * Loads and returns all assignments from assignments.json.
 *
 * @returns {Promise<Object[]>} Assignments array.
 */
async function getAllAssignments() {
    return await readArrayFile(assignmentsFilePath)
}

/**
 * Finds all assignments for a given employeeId (case-insensitive).
 *
 * @param {string} employeeId Employee ID.
 * @returns {Promise<Object[]>} Array of assignment objects for this employee.
 */
async function findAssignmentsByEmployeeId(employeeId) {
    const target = String(employeeId).trim().toUpperCase()
    const assignments = await readArrayFile(assignmentsFilePath)

    const out = []
    for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i]
        const id = String(a.employeeId).trim().toUpperCase()
        if (id === target) {
            out.push(a)
        }
    }
    return out
}

/**
 * Checks if an assignment exists for a given (employeeId, shiftId) pair.
 * This enforces a composite-key style rule in the bridge table.
 *
 * @param {string} employeeId Employee ID.
 * @param {string} shiftId Shift ID.
 * @returns {Promise<boolean>} True if exists, otherwise false.
 */
async function assignmentExists(employeeId, shiftId) {
    const emp = String(employeeId).trim().toUpperCase()
    const sh = String(shiftId).trim().toUpperCase()
    const assignments = await readArrayFile(assignmentsFilePath)

    for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i]
        const aEmp = String(a.employeeId).trim().toUpperCase()
        const aSh = String(a.shiftId).trim().toUpperCase()
        if (aEmp === emp && aSh === sh) {
            return true
        }
    }
    return false
}

/**
 * Inserts a new assignment into assignments.json.
 *
 * @param {{employeeId:string,shiftId:string}} assignment Assignment object.
 * @returns {Promise<void>} No return value.
 */
async function insertAssignment(assignment) {
    const assignments = await readArrayFile(assignmentsFilePath)
    assignments.push(assignment)
    await writeArrayFile(assignmentsFilePath, assignments)
}

module.exports = {
    loadConfig,

    getAllEmployees,
    findEmployeeById,
    insertEmployee,

    getAllShifts,
    findShiftById,

    getAllAssignments,
    findAssignmentsByEmployeeId,
    assignmentExists,
    insertAssignment
}
