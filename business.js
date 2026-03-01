const storage = require('./storage')

/**
 * Generates the next employee ID in the format E### (example: E006).
 *
 * @param {Object[]} employees Array of employee objects.
 * @returns {string} Next employee ID.
 */
function generateNextEmployeeId(employees) {
    let maxNum = 0

    for (let i = 0; i < employees.length; i++) {
        const e = employees[i]
        const id = String(e.employeeId).trim().toUpperCase()

        if (id.length === 4 && id[0] === 'E') {
            const numPart = id.substring(1)
            const parsed = Number(numPart)

            if (Number.isNaN(parsed) === false) {
                if (parsed > maxNum) {
                    maxNum = parsed
                }
            }
        }
    }

    const nextNum = maxNum + 1
    const padded = String(nextNum).padStart(3, '0')
    return 'E' + padded
}

/**
 * Sorts schedule rows by (date, startTime) ascending using selection sort.
 *
 * @param {Object[]} rows Array of rows: {date,startTime,endTime}.
 * @returns {void} No return value.
 */
function sortScheduleRows(rows) {
    for (let i = 0; i < rows.length; i++) {
        let minIndex = i

        for (let j = i + 1; j < rows.length; j++) {
            const left = rows[j]
            const right = rows[minIndex]

            const leftKey = String(left.date) + ' ' + String(left.startTime)
            const rightKey = String(right.date) + ' ' + String(right.startTime)

            if (leftKey < rightKey) {
                minIndex = j
            }
        }

        if (minIndex !== i) {
            const temp = rows[i]
            rows[i] = rows[minIndex]
            rows[minIndex] = temp
        }
    }
}

/**
 * Returns all employees.
 *
 * @returns {Promise<Object[]>} Array of employees.
 */
async function listEmployees() {
    return await storage.getAllEmployees()
}

/**
 * Returns a single employee by ID.
 *
 * @param {string} employeeId Employee ID.
 * @returns {Promise<Object|null>} Employee object or null.
 */
async function getEmployeeById(employeeId) {
    const empId = String(employeeId).trim().toUpperCase()
    return await storage.findEmployeeById(empId)
}

/**
 * Adds a new employee after validating name and phone (non-empty).
 *
 * @param {string} name Employee name.
 * @param {string} phone Phone number.
 * @returns {Promise<{ok:boolean,message:string}>} Result object.
 */
async function addEmployee(name, phone) {
    const cleanName = String(name).trim()
    const cleanPhone = String(phone).trim()

    if (cleanName.length === 0) {
        return { ok: false, message: 'Name cannot be empty' }
    }
    if (cleanPhone.length === 0) {
        return { ok: false, message: 'Phone cannot be empty' }
    }

    const employees = await storage.getAllEmployees()
    const nextId = generateNextEmployeeId(employees)

    const newEmployee = {
        employeeId: nextId,
        name: cleanName,
        phone: cleanPhone
    }

    await storage.insertEmployee(newEmployee)
    return { ok: true, message: 'Employee added...' }
}

/**
 * Updates an employee's name and phone.
 *
 * @param {string} employeeId Employee ID.
 * @param {string} name New name.
 * @param {string} phone New phone.
 * @returns {Promise<{ok:boolean,message:string}>} Result object.
 */
async function updateEmployeeDetails(employeeId, name, phone) {
    const empId = String(employeeId).trim().toUpperCase()
    const cleanName = String(name).trim()
    const cleanPhone = String(phone).trim()

    const employee = await storage.findEmployeeById(empId)
    if (employee === null) {
        return { ok: false, message: 'Employee does not exist' }
    }

    await storage.updateEmployeeDetails(empId, cleanName, cleanPhone)
    return { ok: true, message: 'Employee updated' }
}

/**
 * Returns schedule rows for a given employee.
 *
 * @param {string} employeeId Employee ID.
 * @returns {Promise<{ok:boolean,rows:Object[]}>} Status and rows.
 */
async function getEmployeeSchedule(employeeId) {
    const empId = String(employeeId).trim().toUpperCase()

    const employee = await storage.findEmployeeById(empId)
    if (employee === null) {
        return { ok: false, rows: [] }
    }

    const assignments = await storage.findAssignmentsByEmployeeId(empId)
    const rows = []

    for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i]
        const shift = await storage.findShiftById(a.shiftId)
        if (shift !== null) {
            rows.push({
                date: shift.date,
                startTime: shift.startTime,
                endTime: shift.endTime
            })
        }
    }

    if (rows.length > 0) {
        sortScheduleRows(rows)
    }

    return { ok: true, rows: rows }
}

module.exports = {
    listEmployees,
    getEmployeeById,
    addEmployee,
    updateEmployeeDetails,
    getEmployeeSchedule
}