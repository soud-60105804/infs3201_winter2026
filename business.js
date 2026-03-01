const storage = require('./storage')

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

async function listEmployees() {
    return await storage.getAllEmployees()
}

async function getEmployeeById(employeeId) {
    const empId = String(employeeId).trim().toUpperCase()
    return await storage.findEmployeeById(empId)
}

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