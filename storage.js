const fs = require('fs/promises')

const employeesFilePath = 'employees.json'
const shiftsFilePath = 'shifts.json'
const assignmentsFilePath = 'assignments.json'

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

async function writeArrayFile(filePath, items) {
    const text = JSON.stringify(items, null, 4)
    await fs.writeFile(filePath, text, 'utf-8')
}

async function getAllEmployees() {
    return await readArrayFile(employeesFilePath)
}

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

async function insertEmployee(employee) {
    const employees = await readArrayFile(employeesFilePath)
    employees.push(employee)
    await writeArrayFile(employeesFilePath, employees)
}

async function getAllShifts() {
    return await readArrayFile(shiftsFilePath)
}

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

async function getAllAssignments() {
    return await readArrayFile(assignmentsFilePath)
}

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

module.exports = {
    getAllEmployees,
    findEmployeeById,
    insertEmployee,

    getAllShifts,
    findShiftById,

    getAllAssignments,
    findAssignmentsByEmployeeId
}